"use strict";
class Program {

    constructor(instructions) {
        this.errors = [];
        this.pc = 0x0;
        this.line = 0;
        this.registers = new Int32Array(32);
        this.memory = new Int32Array((0xffffff + 1) / 4); // Creates a memory array addressable by 24-bit addresses = 64 MB
        this.insns = instructions.split('\n').map(function(insn) {
            return insn.trim();
        });
        this.labels = {};
        this.generateLabels();
    }

    /* Goes through all the lines and finds the labels and associates pc addresses to them */
    generateLabels() {
        for (var i = 0; i < this.insns.length; ++i) {
            var insn = this.insns[i];
            if (insn.charAt(insn.length-1) == ':') { // encounter a label which ends with a colon
                var label = insn.substring(0, insn.length-1);
                if (this.labels[label] !== undefined) {
                    this.pushError("Found multiple instances of label: " + label);
                }
                this.labels[label] = i + 2; // make label point to the line after it (also zero-index -> one-index)
                this.insns[i] = ""; // remove label so that it does not affect running
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
        if ((imm & 0x8000) == 0x8000) {
            imm |= 0xffff0000;
        }
        return imm;
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
                this.pushError("Unknown value [line " + this.line + "]: " + tok);
            }
        }
        return value;
    }

    step() {
        this.line = this.pc / 4 + 1;
        var insn = this.insns[this.pc / 4];
        this.pc += 4;
        if (insn.indexOf(' ') != -1 && insn.charAt(0) != '#') {
            var op = insn.substring(0, insn.indexOf(' '));
            var stringTokens = insn.substring(insn.indexOf(' '), insn.length).split(",");
            var tokens = [];
            for (var i = 0; i < stringTokens.length; ++i) {
                var trimmed = stringTokens[i].trim();
                if (trimmed.indexOf('#') != -1) { // remove end of line comments
                    trimmed = trimmed.substring(0, trimmed.indexOf('#')).trim();
                    tokens[i] = this.parseToken(trimmed);
                    break;
                }
                else {
                    tokens[i] = this.parseToken(trimmed);
                }
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
                default:
                    this.pushError("Unsupported Op [line " + this.line +"]: " + op);
            }
            this.registers[0] = 0; // MIPS register 0 is hard-wired to 0
        }
        else {
            if (insn != '' && insn.charAt(0) != '#') { // don't error on empty/comment lines
                this.pushError("Invalid instruction [line " + this.line + "]: " + insn);
            }
        }
    }

    runUntil(line) {
        while((this.pc / 4) != line && (this.pc / 4) < this.insns.length) {
            this.step();
        }
    }

    run() {
        while ((this.pc / 4) < this.insns.length) {
            this.step();
        }
    }
}
