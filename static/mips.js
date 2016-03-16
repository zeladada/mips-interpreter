"use strict";
class Program {

    constructor(instructions) {
        this.pc = 0x0;
        this.registers = [];
        for (var i = 0; i < 32; ++i) {
            this.registers.push((0 | 0));
        }
        this.prog = instructions.split("\n").map(function(insn) {
            return insn.trim();
        });
        this.errors = [];
    }

    getRegisters() {
        return this.registers.slice();
    }

    getErrors() {
        return this.errors;
    }

    immPad(imm) {
        if ((imm & 0x8000) == 0x8000) {
            imm |= 0xffff0000;
        }
        return imm;
    }

    addiu(rt, rs, imm) {
        imm = this.immPad(imm);
        this.registers[rt] = this.registers[rs] + imm;
    }

    andi(rt, rs, imm) {
        this.registers[rt] = this.registers[rs] & imm;
    }

    ori(rt, rs, imm) {
        this.registers[rt] = this.registers[rs] | imm;
    }

    xori(rt, rs, imm) {
        this.registers[rt] = this.registers[rs] ^ imm;
    }

    slti(rt, rs, imm) {
        imm = this.immPad(imm);
        this.registers[rt] = (this.registers[rs] < imm) ? (1 | 0) : (0 | 0);
    }

    sltiu(rt, rs, imm) {
        imm = this.immPad(imm);
        this.registers[rt] = ( (this.registers[rs] >>> 0) < (imm >>> 0) ) ? (1 | 0) : (0 | 0);
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
        this.registers[rd] = (this.registers[rs] < this.registers[rt]) ? (1 | 0) : (0 | 0);
    }

    sltu(rd, rs, rt) {
        this.registers[rd] = ( (this.registers[rs] >>> 0) < (this.registers[rt] >>> 0) ) ? (1 | 0) : (0 | 0);
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
        this.registers[rt] = imm << 16;
    }

    run() {
        while (this.pc / 4 < this.prog.length) {
            var insn = this.prog[this.pc / 4];
            var line = this.pc / 4 + 1;
            if (insn.indexOf(' ') != -1 && insn.charAt(0) != '#') {
                var op = insn.substring(0, insn.indexOf(' '));
                var stringTokens = insn.substring(insn.indexOf(' '), insn.length).split(",");
                var tokens = [];
                for (var i = 0; i < stringTokens.length; ++i) {
                    var trimmed = stringTokens[i].trim();
                    if (trimmed.indexOf('#') != -1) { // remove comments
                        trimmed = trimmed.substring(0, trimmed.indexOf('#')).trim();
                    }
                    var tok = parseInt(trimmed);
                    if (isNaN(tok)) { // deals with $ in front of register number
                        tok = parseInt(trimmed.substring(1, trimmed.length));
                    }
                    if (isNaN(tok)) { // definitely not a number
                        this.errors.push("Unknown value [line " + line + "]: " + trimmed);
                    }
                    tokens[i] = tok | 0;
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
                        var errmsg = "Unsupported Op [line " + line +"]: " + op;
                        console.log(errmsg);
                        this.errors.push(errmsg);
                }
            }
            else {
                errmsg = "Invalid instruction [line " + line + "]: " + insn;
                console.log(errmsg);
                this.errors.push(errmsg);
                console.log(this.errors);
            }
            this.pc += 4;
        }
    }
}
