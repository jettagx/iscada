

function newReader(file)
{
    let reader = {};
    let index = 0;

    reader.checkHeader = function ()
    {
        //直接掉过头部
        index += 33;
    }

    reader.readByte = function ()
    {
        //返回一个字节数据
        return file[index++];
    }

    reader.readBytes = function (n)
    {
        //返回多个字节数据
        let buffer = file.slice(index, index + n);
        index += n;
        return buffer;
    }

    reader.readUint64 = function ()
    {
        //返回8个字节数据
        let buffer = new ArrayBuffer(8);
        let dataview = new DataView(buffer);

        for (let i = 0; i < 8; i++)
        {
            dataview.setUint8(i, file[index++]);
        }

        return dataview.getBigUint64(0, true);
    }

    reader.readInt64 = function ()
    {
        //返回8个字节数据
        let buffer = new ArrayBuffer(8);
        let dataview = new DataView(buffer);

        for (let i = 0; i < 8; i++)
        {
            dataview.setInt8(i, file[index++]);
        }

        return dataview.getBigInt64(0, true);
    }

    reader.readUint32 = function ()
    {
        //返回8个字节数据
        let buffer = new ArrayBuffer(4);
        let dataview = new DataView(buffer);

        for (let i = 0; i < 4; i++)
        {
            dataview.setUint8(i, file[index++]);
        }

        let buf = dataview.getUint32(0, true);
        return buf;
    }

    function ab2str(buf) {
        return String.fromCharCode.apply(null, new Uint16Array(buf));
    }

    reader.readString = function ()
    {
        //返回字符串
        let size = reader.readByte();
        if (size == 0)
        {
            return "";
        }
            
        if (size == 0xff)
        {
            size = reader.readUint64();
        }
        let buf = ab2str(reader.readBytes(size - 1));
        return buf;
    }

    

    reader.readCode = function ()
    {
        //首先读取代码长度
        let codes = [];
        let length = reader.readUint32();
        for (let i = 0; i < length; i++)
        {
            codes.push(reader.readUint32());
        }
        
        return codes;
    }

    reader.readLuaInteger = function ()
    {
        return reader.readInt64();
    }

    reader.readLuaNumber = function ()
    {
        return Number(reader.readInt64());
    }

    reader.readConstants = function ()
    {
        let length = reader.readUint32();
        let buf = [];

        for (let i = 0; i < length; i++)
        {
            buf.push(reader.readConstant());
        }

        return buf;
    }

    reader.readConstant = function ()
    {
        //读取常量表数据
        const TAG_NIL = 0;
        const TAG_BOOLEAN = 1;
        const TAG_NUMBER = 2;
        const TAG_INTEGER = 3;
        const TAG_SHORT_STR = 4;
        const TAG_LONG_STR = 5;

        switch (reader.readByte())
        {
            case TAG_NIL:
                return null;
                break;

            case TAG_BOOLEAN:
                return reader.readByte() != 0;
                break; 

            case TAG_NUMBER:
                return reader.readLuaNumber();
                break; 

            case TAG_INTEGER:
                return reader.readLuaInteger();
                break;

            case TAG_SHORT_STR:
                return reader.readString();
                break; 

            case TAG_LONG_STR:
                return reader.readString();
                break;

            default:
                throw "readConstants error";
        }
    }

    reader.readUpvalues = function ()
    {
        let upvalues = [];
        let length = reader.readUint32();

        for (let i = 0; i < length; i++)
        {
            upvalues.push(
            {
                Instack : reader.readByte(),
                Idx : reader.readByte()
            });
        }

        return upvalues;
    }

    reader.readProtos = function (parentSource)
    {
        let protos = [];
        let length = reader.readUint32();

        for (let i = 0; i < length; i++)
        {
            protos.push(reader.readProto(parentSource));
        }

        return protos;
    }

    reader.readLineInfo = function ()
    {
        let lineInfo = [];
        let length = reader.readUint32();

        for (let i = 0; i < length; i++)
        {
            lineInfo.push(reader.readUint32());
        }

        return lineInfo;
    }

    reader.readLocVars = function ()
    {
        let locVars = [];
        let length = reader.readUint32();

        for (let i = 0; i < length; i++)
        {
            locVars.push(
                {
                    VarName : reader.readString(),
                    StartPc : reader.readUint32(),
                    EndPc : reader.readUint32()
                }
            );
        }

        return locVars;
    }

    reader.readUpvalueNames = function ()
    {
        let names = [];
        let length = reader.readUint32();

        for (let i = 0; i < length; i++)
        {
            names.push(reader.readString());
        }

        return names;
    }

    reader.readProto = function (parentSource)
    {
        let source = reader.readString();
        if (source == "")
        {
            source = parentSource;
        }

        return {
            Source : source,
            LineDefined : reader.readUint32(),
            LastLineDefined : reader.readUint32(),
            NumParam : reader.readByte(),
            IsVararg : reader.readByte(),
            MaxStackSize : reader.readByte(),
            Code : reader.readCode(),
            Constants : reader.readConstants(),
            Upvalues : reader.readUpvalues(),
            Protos : reader.readProtos(source),
            LineInfo : reader.readLineInfo(),
            LocVars : reader.readLocVars(),
            UpvalueNames : reader.readUpvalueNames()
        };
    }

    return reader;
}

function unDump(file)
{
    let reader = newReader(file);

    reader.checkHeader();
    reader.readByte();

    return reader.readProto("");
}


//打印输出获得的信息
function list(proto)
{
    printCode(proto);
}

const OpArgN = 0;
const OpArgU = 1;
const OpArgR = 2;
const OpArgK = 3;

const IABC = 0;
const IABx = 1;
const IAsBx = 2;
const IAx = 3;


let opCodes = [];

opCodes[0x6]  = getOpInfo(0, 1, OpArgU, OpArgK, IABC, "GETTABUP");
opCodes[0x1]  = getOpInfo(0, 1, OpArgK, OpArgN, IABx, "LOADK");
opCodes[0x24] = getOpInfo(0, 1, OpArgU, OpArgU, IABC, "CALL");
opCodes[0x26] = getOpInfo(0, 0, OpArgU, OpArgN, IABC, "RETURN");

function getOpInfo(testFlag, setAFlag, argBMode, argCMode, opMode, name)
{
    let i = {};
    i.testFlag = testFlag; 
    i.setAFlag = setAFlag;
    i.argBMode = argBMode;
    i.argCMode = argCMode;
    i.opMode = opMode;
    i.name = name;

    return i;
}

// 参数是4字节的指令
function inst(instruction)
{
    let inst = {};

    function opCode(instruction)
    {
        return instruction & 0x3F;
    }

    function ABC()
    {
        a = instruction >> 6 & 0xFF;
        c = instruction >> 14 & 0x1FF;
        b = instruction >> 23 & 0x1FF;

        return {a,b,c};
    }

    function ABx()
    {
        a = instruction >> 6 & 0xFF;
        bx = instruction >> 14;

        return {a,bx};
    }

    inst.instruction = instruction;
    inst.opCode = opCode;
    inst.OpInfo = opCodes[opCode(instruction)];
    inst.abc = ABC;
    inst.abx = ABx;

    return inst;
}

function printOperands(inst)
{
    let OpInfo = inst.OpInfo;

    switch (OpInfo.opMode) {
        case IABC:
            
            let val = inst.abc();
            let a = val.a;
            let b = val.b;
            let c = val.c;

            console.log(a);

            if (OpInfo.argBMode != OpArgN)
            {
                if (b > 0xff)
                {
                    console.log(" %d", -1-(b&0xff));
                }
                else
                {
                    console.log(" %d", b);
                }
            }

            if (OpInfo.argCMode != OpArgN)
            {
                if (c > 0xff)
                {
                    console.log(" %d", -1-(c&0xff));
                }
                else
                {
                    console.log(" %d", c);
                }
            }
            break;

        case IABx:
            let val_ = inst.abx();
            let a_ = val_.a;
            let bx = val_.bx;

            console.log(a_);

            if (OpInfo.argBMode == OpArgK)
            {
                console.log(" %d", -1-bx);
            }
            else if (OpInfo.argBMode == OpArgU)
            {
                console.log(" %d", bx);
            }
        
            break;
    
        default:
            break;
    }
}

function printCode(proto)
{
    // for(let i = 0; i < proto.Code.length; i++)
    // {
    //     console.log("%d 0x%s", i+1, proto.Code[i].toString(16));
    // }

    for(let i = 0; i < proto.Code.length; i++)
    {
        let code = proto.Code[i];
        let inst_ = inst(code);

        //打印指令码名称
        console.log("%d %s", i+1, inst_.OpInfo.name);

        //打印指令码参数
        printOperands(inst_);
    }
}


function luaMain()
{
    let file = lua.readfile("luac.out");

    file.then(fileData =>{
        if (fileData != "")
        {
            let proto = unDump(fileData);
    
            list(proto);
        }
    });
    
}

luaMain();