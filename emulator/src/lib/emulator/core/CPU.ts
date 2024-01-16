import CPUMemory from "./CPUMemory.ts";

import { INTERRUPTS } from "./constants.js";

import { instructions } from "./instructions.js";

import { modes } from "./modes.js";

import { opcodes } from "./opcodes.js";

class CPU {
    public memory: CPUMemory;
    public mapper: any;
    public apu: any;
    public ppu: any;
    public controller: any;

    public cycles: number;
    public branch: number;
    public program_counter: number;
    public sp: number;

    public a: number;
    public x: number;
    public y: number;

    public carry_flag: number;
    public zero_flag: number;
    public interrupt_flag: number;
    public decimal_flag: number;
    public overflow_flag: number;
    public negative_flag: number;

    public stallCounter: number;
    public tmpCycles: number;
    public instrCycles: number;
    public instrCode: number;
    public lastInstrCode: number;
    public instrOpCode: number;
    public instrMode: number;
    public instrSize: number;
    public addr: number;

    public interrupt: any;
    private _modes: any;
    private _instructions: any;
    private _opcodes: any;


    constructor() {
        // Hardware connected to CPU
        this.memory = new CPUMemory();
        this.mapper = null;
        this.apu = null;
        this.ppu = null;
        this.controller = null;

        // Cycles Counter
        this.cycles = 0;
        // Branch counter used by some opcodes for extra cycles
        // when pages are crossed
        this.branch = 0;

        // Program Counter
        this.program_counter = 0x00;
        // Stack Pointer
        this.sp = 0x00;

        // Registers
        this.a = 0;
        this.x = 0;
        this.y = 0;

        // Flags
        this.carry_flag = 0; // Carry flag
        this.zero_flag = 0; // Zero flag
        this.interrupt_flag = 0; // Interrupt flag
        this.decimal_flag = 0; // Decimal flag
        // Break flag
        this.overflow_flag = 0; // Overflow flag
        this.negative_flag = 0; // Negative flag
        // Unused flag

        // Interrupt type
        this.interrupt = null;

        this._modes = modes;
        this._instructions = instructions;
        this._opcodes = opcodes;

        this.stallCounter = 0;

        // Tick variables
        this.tmpCycles = 0;
        this.instrCycles = 0;
        this.instrCode = 0;
        this.lastInstrCode = 0;
        this.instrOpCode = 0;
        this.instrMode = 0;
        this.instrSize = 0;
        this.addr = 0;
    }

    connect(apu: any, ppu: any, controller: any) {
        this.apu = apu;
        this.ppu = ppu;
        this.controller = controller;
    }

    connectROM(rom: any) {
        // Improve that
        // this.mapper = rom.mapper;
        // this.mapper.cpu = this;
    }

    stall() {
        this.stallCounter += this.cycles % 2 ? 514 : 513;
    }

    reset() {
        this.cycles = 0;
        this.a = 0;
        this.x = 0;
        this.y = 0;
        this.interrupt = null;
        this.stallCounter = 0;
        this.program_counter = this.read16(0xfffc);
        this.sp = 0xfd;
        this.setFlags(0x24);
    }

    tick() {
        this.tmpCycles = this.cycles;
        this.branch = 0;

        // Stalled after PPU OAMDMA
        if (this.stallCounter > 0) {
            this.stallCounter--;
            // Should return 1 but this somehow fixes some games.
            // Probably due to CPU being not exactly accurate
            // ¯\_(ツ)_/¯
            return 0;
        }

        // TODO Not DRY
        if (this.interrupt !== null) {
            switch (this.interrupt) {
                case INTERRUPTS.NMI: {
                    this.stackPush16(this.program_counter);
                    this.stackPush8(this.getFlags() & ~0x10);
                    this.program_counter = this.read16(0xfffa);
                    this.interrupt_flag = 1;
                    this.cycles += 7;
                    break;
                }
                case INTERRUPTS.IRQ: {
                    if (this.interrupt_flag === 0) {
                        this.stackPush16(this.program_counter);
                        this.stackPush8(this.getFlags() & ~0x10);
                        this.program_counter = this.read16(0xfffe);
                        this.interrupt_flag = 1;
                        this.cycles += 7;
                    }
                    break;
                }
            }

            this.interrupt = null;

            return 7;
        }

        try {
            this.instrCode = this.read8(this.program_counter);
        } catch (err) {
            throw new Error("Could not read next instruction: " + err);
        }

        // 0xFF is not implemented as an instruction,
        // if RTI is called mutliple times
        if (
            this.instrCode === 0xff ||
            (this.instrCode === 64 && this.instrCode === this.lastInstrCode)
        ) {
            return -1;
        }

        [
            this.instrOpCode,
            this.instrMode,
            this.instrSize,
            this.instrCycles
        ] = this._instructions[this.instrCode];

        this.addr = this._modes[this.instrMode](this);

        this.program_counter += this.instrSize;
        this.cycles += this.instrCycles;

        this._opcodes[this.instrOpCode](this.addr, this);

        // Save the last executed instrCode to prevent infinite loop of RTI (when testing)
        this.lastInstrCode = this.instrCode;

        return this.cycles - this.tmpCycles;
    }

    /**
     * Interrupts
     */
    triggerNMI() {
        this.interrupt = INTERRUPTS.NMI;
    }

    triggerIRQ() {
        this.interrupt = INTERRUPTS.IRQ;
    }

    /**
     * Read & Write methods
     *
     * CPU RAM: 0x0000 => 0x2000
     * PPU Registers: 0x2000 => 0x4000
     * Controller: 0x4016
     * Controller2: 0x4016
     * ROM Mapper: 0x6000 => 0x10000
     */

    read8(address: number) {
        if (address < 0x2000) {
            return this.memory.read8(address);
        } else if (address < 0x4000) {
            // 7 bytes PPU registers
            // mirrored from 0x2000 to 0x4000
            return this.ppu.read8(0x2000 + (address % 8));
        } else if (address === 0x4014) {
            return this.ppu.read8(address);
        } else if (address === 0x4015) {
            return this.apu.read8();
        } else if (address === 0x4016) {
            return this.controller.read8();
        } else if (address === 0x4017) {
            return 0;
        } else if (address < 0x6000) {
            console.log("I/O REGISTERS");
            return 0;
        } else {
            return this.ppu.memory.mapper.read8(address);
        }
    }

    read16(address: number) {
        // Read two bytes and concatenate them
        return (this.read8(address + 1) << 8) | this.read8(address);
    }

    read16indirect(address: number) {
        // Special read16 method for indirect mode reading (NES bug)
        const addr2 = (address & 0xff00) | (((address & 0xff) + 1) & 0xff);
        const lo = this.read8(address);
        const hi = this.read8(addr2);

        return (hi << 8) | lo;
    }

    write8(address: number, value: number) {
        if (address < 0x2000) {
            this.memory.write8(address, value);
        } else if (address < 0x4000) {
            // 7 bytes PPU registers
            // mirrored from 0x2000 to 0x4000
            this.ppu.write8(0x2000 + (address % 8), value);
        } else if (address === 0x4014) {
            // This might seem a bit odd but this avoids circular reference (ppu using cpu methods)
            address = value << 8;
            this.ppu.tmpOamAddress = this.ppu.oamAddress;

            for (let i = 0; i < 256; i++) {
                this.ppu.memory.oam[this.ppu.oamAddress] = this.read8(address);
                this.ppu.oamAddress++;
                address++;
            }

            this.ppu.oamAddress = this.ppu.tmpOamAddress;
            this.stall();
        } else if (address === 0x4015) {
            this.apu.write8(address, value);
        } else if (address === 0x4016) {
            this.controller.write8(value);
        } else if (address === 0x4017) {
            // TODO sound
        } else if (address >= 0x6000) {
            // Write to mapper (handled by PPU)
            this.ppu.memory.mapper.write8(address, value);
        } else if (address < 0x6000) {
            // console.log('I/O REGISTERS');
        }
    }

    /**
     * Stack methods
     */

    stackPush8(value: number) {
        this.memory.stack[this.sp] = value;
        this.sp = (this.sp - 1) & 0xff;
    }

    stackPush16(value: number) {
        // Get the 8 highest bits
        // Truncate the 8 lower bits
        // Push the two parts of `value`
        this.stackPush8(value >> 8);
        this.stackPush8(value & 0xff);
    }

    stackPull8() {
        this.sp = (this.sp + 1) & 0xff;
        return this.memory.stack[this.sp];
    }

    stackPull16(value: number) {
        return this.stackPull8() | (this.stackPull8() << 8);
    }

    /**
     * Flag methods
     */

    setZeroFlag(value: number) {
        if (value === 0) {
            this.zero_flag = 1;
        } else {
            this.zero_flag = 0;
        }
    }

    setNegativeFlag(value: number) {
        if ((value & 0x80) !== 0) {
            this.negative_flag = 1;
        } else {
            this.negative_flag = 0;
        }
    }

    getFlags() {
        // Concatenate the values of the flags in an int
        let flags = 0;

        flags |= this.carry_flag << 0;
        flags |= this.zero_flag << 1;
        flags |= this.interrupt_flag << 2;
        flags |= this.decimal_flag << 3;
        flags |= 0 << 4;
        flags |= 1 << 5;
        flags |= this.overflow_flag << 6;
        flags |= this.negative_flag << 7;

        return flags;
    }

    setFlags(value: number) {
        this.carry_flag = (value >> 0) & 1;
        this.zero_flag = (value >> 1) & 1;
        this.interrupt_flag = (value >> 2) & 1;
        this.decimal_flag = (value >> 3) & 1;
        this.overflow_flag = (value >> 6) & 1;
        this.negative_flag = (value >> 7) & 1;
    }
}

export default CPU;