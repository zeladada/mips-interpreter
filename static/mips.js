"use strict";
class Program {

    constructor(instructions) {
        this.errors = [];
        this.pc = 0x0;
        this.line = 0;
        this.registers = new Int32Array(32);
        this.memory = new Uint8Array(0xffffff + 1); // Creates a memory array addressable by 24-bit addresses = 64 MB
        this.insns = instructions.split('\n').map(function(insn) {
            return insn.trim();
        });
        this.labels = {};
        this.generateLabels();
        this.linkLabels();
    }

    /** Goes through all the lines and finds the labels and associates pc addresses to them */
    generateLabels() {
        var filteredInstructions = [];
        var filteredIndex = 0;
        for (var i = 0; i < this.insns.length; ++i) {
            var lineNo = i + 1;
            var insn = this.insns[i];
            if (insn.indexOf('#') != -1) { // remove everything after a comment
                insn = insn.substring(0, insn.indexOf('#')).trim();
            }
            if (insn.charAt(insn.length-1) == ':') { // encounter a label which ends with a colon
                var label = insn.substring(0, insn.length-1);
                if (this.labels[label] !== undefined) {
                    this.pushError("Found multiple instances of label: " + label + " [line " + lineNo + "]");
                }
                if (/(\d+)/.test(label)) {
                    this.pushError("Cannot use numbers in label name: " + label + " [line " + lineNo + "]");
                    continue;
                }
                this.labels[label] = filteredIndex; // make label point to the line after it (also zero-index -> one-index)
            }
            else if (insn != '') { // ignore empty/comment lines
                filteredInstructions.push([insn, lineNo]); // push instruction and line number for debugging purposes
                filteredIndex++;
            }
        }
        this.insns = filteredInstructions;
    }

    /** Converts labels to memory locations */
    linkLabels() {
        for (var i = 0; i < this.insns.length; ++i) {
            var insn = this.insns[i][0];
            var lineNo = this.insns[i][1];
            if (insn.indexOf(' ') != -1) { // ignore changing labels of bad instructions
                var op = insn.substring(0, insn.indexOf(' ')).toLowerCase();
                var tokens = insn.substring(insn.indexOf(' '), insn.length).split(',');
                var label = tokens[tokens.length-1].trim(); // label comes at the very end
                if (op == "j" || op == "jal") {
                    if (this.labels[label] !== undefined) {
                        tokens[tokens.length-1] = this.labels[label]; // absolute jump to the label location
                    }
                    else {
                        this.pushError("Could not find label: " + label + " [line " + lineNo + "]");
                        tokens[tokens.length-1] = 0x3ffffff; // most likely a label issue, so we want it to jump very far to the end
                    }
                }
                else if (op == "beq" || op == "bne" || op == "bltz" || op == "blez" || op == "bgtz" || op == "bgez") {
                    if (this.labels[label] !== undefined) {
                        tokens[tokens.length-1] = this.labels[label] - (i + 1); // branch offset relative to delay slot instruction
                    }
                    else {
                        this.pushError("Could not find label: " + label + " [line " + lineNo + "]");
                        tokens[tokens.length-1] = 0x7fff; // most likely a label issue, so we want it to branch very far to the end
                    }
                }
                this.insns[i][0] = op + " " + tokens.join(', '); // instruction with labels replaced
            }
        }
    }

    getRegisters() {
        var registerCopy = [];
        for (var i = 0; i < 32; ++i) {
            registerCopy.push(this.registers[i]);
        }
        return registerCopy;
    }

    getErrors() {
        return this.errors;
    }

    pushError(errmsg) {
        console.log(errmsg);
        this.errors.push(errmsg);
    }

    normalizeImm(imm) {
        if (imm > 0xffff) {
            this.pushError("Immediate more than 16 bits [line " + this.line + "]: " + imm);
        }
        return imm & 0xffff;
    }

    immPad(imm) {
        if ((imm & 0x8000) == 0x8000) { // sign extend
            imm |= 0xffff0000;
        }
        return imm;
    }

    /** Verifies that there is another delay slot in progress */
    verifyDelaySlot() {
        if (this.delaySlot) {
            this.pushError("Cannot have a jump/branch instruction in delay slot! [line " + this.line + "]. Ignoring jump/branch in delay slot.");
            return true;
        }
        return false;
    }

    /** Verifies a memory range from loc1 - loc2 */
    verifyMemory(loc1, loc2) {
        if (loc1 < 0 || loc1 >= 0xfffffff + 1 || loc2 < 0 || loc2 >= 0xfffffff + 1) {
            this.pushError("Invalid memory location [line " + this.line + "]: " + loc1 +
                    ((loc2 === undefined) ? "" : " to " + loc2));
        }
    }

    addiu(rt, rs, imm) {
        imm = this.normalizeImm(imm);
        imm = this.immPad(imm);
        this.registers[rt] = this.registers[rs] + imm;
    }

    andi(rt, rs, imm) {
        imm = this.normalizeImm(imm);
        this.registers[rt] = this.registers[rs] & imm;
    }

    ori(rt, rs, imm) {
        imm = this.normalizeImm(imm);
        this.registers[rt] = this.registers[rs] | imm;
    }

    xori(rt, rs, imm) {
        imm = this.normalizeImm(imm);
        this.registers[rt] = this.registers[rs] ^ imm;
    }

    slti(rt, rs, imm) {
        imm = this.normalizeImm(imm);
        imm = this.immPad(imm);
        this.registers[rt] = (this.registers[rs] < imm) ? 1 : 0;
    }

    sltiu(rt, rs, imm) {
        imm = this.normalizeImm(imm);
        imm = this.immPad(imm);
        this.registers[rt] = ( (this.registers[rs] >>> 0) < (imm >>> 0) ) ? 1 : 0;
    }

    addu(rd, rs, rt) {
        this.registers[rd] = this.registers[rs] + this.registers[rt];
    }

    subu(rd, rs, rt) {
        this.registers[rd] = this.registers[rs] - this.registers[rt];
    }

    and(rd, rs, rt) {
        this.registers[rd] = this.registers[rs] & this.registers[rt];
    }

    or(rd, rs, rt) {
        this.registers[rd] = this.registers[rs] | this.registers[rt];
    }

    xor(rd, rs, rt) {
        this.registers[rd] = this.registers[rs] ^ this.registers[rt];
    }

    nor(rd, rs, rt) {
        this.registers[rd] = ~(this.registers[rs] | this.registers[rt]);
    }

    slt(rd, rs, rt) {
        this.registers[rd] = (this.registers[rs] < this.registers[rt]) ? 1 : 0;
    }

    sltu(rd, rs, rt) {
        this.registers[rd] = ( (this.registers[rs] >>> 0) < (this.registers[rt] >>> 0) ) ? 1 : 0;
    }

    movn(rd, rs, rt) {
        if (this.registers[rt] != 0) {
            this.registers[rd] = this.registers[rs];
        }
    }

    movz(rd, rs, rt) {
        if (this.registers[rt] == 0) {
            this.registers[rd] = this.registers[rs];
        }
    }

    sll(rd, rt, sa) {
        this.registers[rd] = this.registers[rt] << sa;
    }

    srl(rd, rt, sa) {
        this.registers[rd] = this.registers[rt] >>> sa;
    }

    sra(rd, rt, sa) {
        this.registers[rd] = this.registers[rt] >> sa;
    }

    sllv(rd, rt, rs) {
        this.registers[rd] = this.registers[rt] << (this.registers[rs] & 0x0000001f);
    }

    srlv(rd, rt, rs) {
        this.registers[rd] = this.registers[rt] >>> (this.registers[rs] & 0x0000001f);
    }

    srav(rd, rt, rs) {
        this.registers[rd] = this.registers[rt] >> (this.registers[rs] & 0x0000001f);
    }

    lui(rt, imm) {
        imm = this.normalizeImm(imm);
        this.registers[rt] = imm << 16;
    }

    j(target) {
        if (!this.verifyDelaySlot()) { // only execute jump if this is not a delay slot instruction
            this.delayslot = true;
            var newpc = (this.pc & 0xf0000000) + (target << 2); // pc already points to instruction in delay slot
            this.step();
            this.pc = newpc;
            this.delaySlot = false;
        }
    }

    jal(target) {
        if (!this.verifyDelaySlot()) { // only change $ra if this is not a delay slot instruction
            this.registers[31] = this.pc + 4; // pc was already incremented by 4, so $ra is pc + 8 (second instruction after jump)
        }
        this.j(target);
    }

    jr(rs) {
        if (!this.verifyDelaySlot()) { // only execute jump if this is not a delay slot instruction
            this.delayslot = true;
            this.step();
            this.pc = this.registers[rs]; // pc was incremented by 4 twice, once before the jump instruction in step() and another in the above call to step()
            this.delaySlot = false;
        }
    }

    jalr(target) {
        if (!this.verifyDelaySlot()) { // only change $ra if this is not a delay slot instruction
            this.registers[31] = this.pc + 4; // pc was already incremented by 4, so $ra is pc + 8 (second instruction after jump)
        }
        this.jr(target);
    }

    beq(rs, rt, offset) {
        offset = this.immPad(offset);
        if (!this.verifyDelaySlot()) {
            this.delaySlot = true;
            var newpc = this.pc + (offset << 2); // pc already points to instruction in delay slot
            this.step();
            if (this.registers[rs] == this.registers[rt]) {
                this.pc = newpc;
            }
            this.delaySlot = false;
        }
    }

    bne(rs, rt, offset) {
        offset = this.immPad(offset);
        if (!this.verifyDelaySlot()) {
            this.delaySlot = true;
            var newpc = this.pc + (offset << 2); // pc already points to instruction in delay slot
            this.step();
            if (this.registers[rs] != this.registers[rt]) {
                this.pc = newpc;
            }
            this.delaySlot = false;
        }
    }

    bltz(rs, offset) {
        offset = this.immPad(offset);
        if (!this.verifyDelaySlot()) {
            this.delaySlot = true;
            var newpc = this.pc + (offset << 2); // pc already points to instruction in delay slot
            this.step();
            if (this.registers[rs] < 0) {
                this.pc = newpc;
            }
            this.delaySlot = false;
        }
    }

    blez(rs, offset) {
        offset = this.immPad(offset);
        if (!this.verifyDelaySlot()) {
            this.delaySlot = true;
            var newpc = this.pc + (offset << 2); // pc already points to instruction in delay slot
            this.step();
            if (this.registers[rs] <= 0) {
                this.pc = newpc;
            }
            this.delaySlot = false;
        }
    }

    bgtz(rs, offset) {
        offset = this.immPad(offset);
        if (!this.verifyDelaySlot()) {
            this.delaySlot = true;
            var newpc = this.pc + (offset << 2); // pc already points to instruction in delay slot
            this.step();
            if (this.registers[rs] > 0) {
                this.pc = newpc;
            }
            this.delaySlot = false;
        }
    }

    bgez(rs, offset) {
        offset = this.immPad(offset);
        if (!this.verifyDelaySlot()) {
            this.delaySlot = true;
            var newpc = this.pc + (offset << 2); // pc already points to instruction in delay slot
            this.step();
            if (this.registers[rs] >= 0) {
                this.pc = newpc;
            }
            this.delaySlot = false;
        }
    }

    lw(rt, offset, base) {
        var loc = offset + this.registers[base];
        this.verifyMemory(loc, loc+3);
        var lsb = this.memory[loc];
        var byte2 = this.memory[loc+1] << 8;
        var byte3 = this.memory[loc+2] << 16;
        var msb = this.memory[loc+3] << 24;
        this.registers[rt] = msb + byte3 + byte2 + lsb;
    }

    lb(rt, offset, base) {
        var loc = offset + this.registers[base];
        this.verifyMemory(loc);
        var byteValue = this.memory[loc];
        if (byteValue & 0x80 == 0x80) { // sign extend
            byteValue |= 0xffffff00;
        }
        this.registers[rt] = byteValue;
    }

    lbu(rt, offset, base) {
        var loc = offset + this.registers[base];
        this.verifyMemory(loc);
        this.registers[rt] = this.memory[loc];
    }

    sw(rt, offset, base) {
        var registerValue = this.registers[rt];
        var loc = offset + this.registers[base];
        this.verifyMemory(loc, loc+3);
        this.memory[loc] = registerValue & 0xffffff00;
        this.memory[loc+1] = (registerValue >>> 8) & 0xffffff00;
        this.memory[loc+2] = (registerValue >>> 16) & 0xffffff00;
        this.memory[loc+3] = (registerValue >>> 24) & 0xffffff00;
    }

    sb(rt, offset, base) {
        var loc = offset + this.registers[base];
        this.verifyMemory(loc);
        this.memory[loc] = this.registers[rt] & 0xffffff00;
    }

    parseRegister(tok) {
        switch(tok) {
            case "$zero":
            case "$0":
                return 0;
            case "$at":
            case "$1":
                return 1;
            case "$v0":
            case "$2":
                return 2;
            case "$v1":
            case "$3":
                return 3;
            case "$a0":
            case "$4":
                return 4;
            case "$a1":
            case "$5":
                return 5;
            case "$a2":
            case "$6":
                return 6;
            case "$a3":
            case "$7":
                return 7;
            case "$t0":
            case "$8":
                return 8;
            case "$t1":
            case "$9":
                return 9;
            case "$t2":
            case "$10":
                return 10;
            case "$t3":
            case "$11":
                return 11;
            case "$t4":
            case "$12":
                return 12;
            case "$t5":
            case "$13":
                return 13;
            case "$t6":
            case "$14":
                return 14;
            case "$t7":
            case "$15":
                return 15;
            case "$s0":
            case "$16":
                return 16;
            case "$s1":
            case "$17":
                return 17;
            case "$s2":
            case "$18":
                return 18;
            case "$s3":
            case "$19":
                return 19;
            case "$s4":
            case "$20":
                return 20;
            case "$s5":
            case "$21":
                return 21;
            case "$s6":
            case "$22":
                return 22;
            case "$s7":
            case "$23":
                return 23;
            case "$t8":
            case "$24":
                return 24;
            case "$t9":
            case "$25":
                return 25;
            case "$k0":
            case "$26":
                return 26;
            case "$k1":
            case "$27":
                return 27;
            case "$gp":
            case "$28":
                return 28;
            case "$sp":
            case "$29":
                return 29;
            case "$fp":
            case "$30":
                return 30;
            case "$ra":
            case "$31":
                return 31;
        }
        this.pushError("Invalid register [line " + this.line + "]: " + tok);
        return undefined; // invalid register
    }

    parseToken(tok) {
        var value;
        if (tok.charAt(0) == '$') {
            value = this.parseRegister(tok);
        }
        else {
            value = parseInt(tok);
            if (isNaN(value)) {
                value = this.labels[tok];
            }
            if (value === undefined) {
                this.pushError("Unknown value [line " + this.line + "]: " + tok);
            }
        }
        return value;
    }

    step() {
        console.log(this.insns[this.pc / 4]);
        var insn = this.insns[this.pc / 4][0];
        this.line = this.insns[this.pc / 4][1];
        this.pc += 4;
        if (insn.indexOf(' ') != -1) { // if not bad format, since all instructions have a space after the op
            var op = insn.substring(0, insn.indexOf(' '));
            var stringTokens = insn.substring(insn.indexOf(' '), insn.length).split(",");
            var tokens = [];
            var tokensIndex = 0;
            for (var i = 0; i < stringTokens.length; ++i) {
                var trimmed = stringTokens[i].trim();
                if (trimmed.indexOf('#') != -1) { // remove end of line comments
                    trimmed = trimmed.substring(0, trimmed.indexOf('#')).trim();
                    tokens[tokensIndex] = this.parseToken(trimmed);
                    break;
                }
                else if (trimmed.indexOf('(') != -1 && trimmed.indexOf(')') != -1) { // location of memory for load/store operations: offset($register)
                    tokens[tokensIndex] = this.parseToken(trimmed.substring(0, trimmed.indexOf('('))); // parse the offset
                    tokensIndex++;
                    tokens[tokensIndex] = this.parseToken(trimmed.substring(trimmed.indexOf('(')+1, trimmed.indexOf(')'))); // parse the register
                }
                else { // parses a single register or immediate value
                    tokens[tokensIndex] = this.parseToken(trimmed);
                }
                tokensIndex++;
            }
            switch(op.toLowerCase()) {
                case "addiu":
                    this.addiu(tokens[0], tokens[1], tokens[2]);
                    break;
                case "andi":
                    this.andi(tokens[0], tokens[1], tokens[2]);
                    break;
                case "ori":
                    this.ori(tokens[0], tokens[1], tokens[2]);
                    break;
                case "xori":
                    this.xori(tokens[0], tokens[1], tokens[2]);
                    break;
                case "slti":
                    this.slti(tokens[0], tokens[1], tokens[2]);
                    break;
                case "sltiu":
                    this.sltiu(tokens[0], tokens[1], tokens[2]);
                    break;
                case "addu":
                    this.addu(tokens[0], tokens[1], tokens[2]);
                    break;
                case "subu":
                    this.subu(tokens[0], tokens[1], tokens[2]);
                    break;
                case "and":
                    this.and(tokens[0], tokens[1], tokens[2]);
                    break;
                case "or":
                    this.or(tokens[0], tokens[1], tokens[2]);
                    break;
                case "xor":
                    this.xor(tokens[0], tokens[1], tokens[2]);
                    break;
                case "nor":
                    this.nor(tokens[0], tokens[1], tokens[2]);
                    break;
                case "slt":
                    this.slt(tokens[0], tokens[1], tokens[2]);
                    break;
                case "sltu":
                    this.sltu(tokens[0], tokens[1], tokens[2]);
                    break;
                case "movn":
                    this.movn(tokens[0], tokens[1], tokens[2]);
                    break;
                case "movz":
                    this.movz(tokens[0], tokens[1], tokens[2]);
                    break;
                case "sll":
                    this.sll(tokens[0], tokens[1], tokens[2]);
                    break;
                case "srl":
                    this.srl(tokens[0], tokens[1], tokens[2]);
                    break;
                case "sra":
                    this.sra(tokens[0], tokens[1], tokens[2]);
                    break;
                case "sllv":
                    this.sllv(tokens[0], tokens[1], tokens[2]);
                    break;
                case "srlv":
                    this.srlv(tokens[0], tokens[1], tokens[2]);
                    break;
                case "srav":
                    this.srav(tokens[0], tokens[1], tokens[2]);
                    break;
                case "lui":
                    this.lui(tokens[0], tokens[1]);
                    break;
                case "j":
                    this.j(tokens[0]);
                    break;
                case "jr":
                    this.jr(tokens[0]);
                    break;
                case "jal":
                    this.jal(tokens[0]);
                    break;
                case "jalr":
                    this.jalr(tokens[0]);
                    break;
                case "beq":
                    this.beq(tokens[0], tokens[1], tokens[2]);
                    break;
                case "bne":
                    this.bne(tokens[0], tokens[1], tokens[2]);
                    break;
                case "bltz":
                    this.bltz(tokens[0], tokens[1]);
                    break;
                case "blez":
                    this.blez(tokens[0], tokens[1]);
                    break;
                case "bgtz":
                    this.bgtz(tokens[0], tokens[1]);
                    break;
                case "bgez":
                    this.bgez(tokens[0], tokens[1]);
                    break;
                case "lw":
                    this.lw(tokens[0], tokens[1], tokens[2]);
                    break;
                case "lb":
                    this.lb(tokens[0], tokens[1], tokens[2]);
                    break;
                case "lbu":
                    this.lbu(tokens[0], tokens[1], tokens[2]);
                    break;
                case "sw":
                    this.sw(tokens[0], tokens[1], tokens[2]);
                    break;
                case "sb":
                    this.sb(tokens[0], tokens[1], tokens[2]);
                    break;
                default:
                    this.pushError("Unsupported Op [line " + this.line +"]: " + op);
            }
            this.registers[0] = 0; // MIPS register 0 is hard-wired to 0
        }
        else {
            if (insn != "nop") { // nops are valid instructions!
                this.pushError("Invalid instruction [line " + this.line + "]: " + insn);
            }
        }
        console.log(this.registers[4]);
    }

    runUntil(line) {
        while ((this.pc / 4) < this.insns.length) {
            if (this.insns[this.pc / 4][1] == line) {
                break;
            }
            this.step();
        }
    }

    run() {
        while ((this.pc / 4) < this.insns.length) {
            this.step();
        }
    }
}
