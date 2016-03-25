MIPS Interpreter
----------------

A MIPS32 Assembly Interpreter written in Javascript for the browser. It allows for inspection of registers and memory, step by step code execution, and fast debugging with breakpoints.

The interpreter follows MIPS specifications such as a delay slot and register syntactic sugar.

## Supported Instructions

The interpreter supports the following instructions:

    - NOP: do nothing
    - ADDIU: add a register to an immediate
    - ADDU: add two registers
    - AND: bitwise AND two registers
    - ANDI: bitwise AND a register with an immediate
    - BEQ: branch if two registers are equal
    - BGEZ: branch if a register is greater than or equal to zero
    - BGTZ: branch if a register is greater than zero
    - BLEZ: branch if a register is less than or equal to zero
    - BLTZ: branch if a register is less than zero
    - BNE: branch if two registers are not equal
    - J: jump to a symbol or hard-coded address
    - JAL: jump to a symbol or a hard-coded address, saving PC+8 in $r31
    - JALR: jump to a register, saving PC+8 to $r31
    - JR: jump to a register
    - LB: load a signed byte from memory
    - LBU: load an unsigned byte from memory
    - LW: load a word from memory
    - SB: store a byte to memory
    - SW: store a word to memory
    - LUI: set a register to an immediate, shifted left by 16 bits
    - MOVN: move one register to another if a third register is non-zero
    - MOVZ: move one register to another if a third register is zero
    - NOR: bitwise OR two registers, then negate the result
    - OR: bitwise OR two registers
    - ORI: bitwise OR a register with an immediate
    - SLL: shift left logical by a constant amount
    - SLLV: shift left logical by a variable amount, specified by a register
    - SLT: set a register to 1 or 0 depending on if another register is signed less than yet another one
    - SLTI: set a register to 1 or 0 depending on if another register is signed less than a signed immediate
    - SLTIU: set a register to 1 or 0 depending on if another register is unsigned less than a signed immediate
    - SLTU: set a register to 1 or 0 depending on if another register is unsigned less than yet another one
    - SRA: shift right arithmetic by a constant amount
    - SRAV: shift right arithmetic by a variable amount, specified by a register
    - SRL: shift right logical by a constant amount
    - SRLV: shift right logical by a variable amount, specified by a register
    - SUBU: subtract a register from another register
    - XOR: bitwise XOR two registers
    - XORI: bitwise XOR a register with an immediate

## Unsupported

The following are not supported:

- Directives, such as `.text` or `.word`

## Notes

- The version in the `v1` folder only supports basic instructions (no jumps/branches or memory), but can work if the program does not need any complex execution
