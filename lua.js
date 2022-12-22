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
        return Number(reader.readInt64());
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
        const TAG_NIL = 0x0;
        const TAG_BOOLEAN = 0x1;
        const TAG_NUMBER = 0x3;
        const TAG_INTEGER = 0x13;
        const TAG_SHORT_STR = 0x4;
        const TAG_LONG_STR = 0x14;

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
            NumParams : reader.readByte(),
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

const OP_GETTABUP = 0x6;
const OP_LOADK = 0x1;
const OP_CALL = 0x24;
const OP_RETURN = 0x26;
const OP_ADD = 0xd;
const OP_TEST = 0x22;
const OP_JMP = 0x1e;
const OP_CLOSURE = 0x2c;
const OP_SETTABUP = 0x08;
const OP_EQ = 0x1f;

const OP_LOADBOOL = 0x3;
const OP_MOVE = 0x0;

const OP_GETUPVAL = 0x05;

const OP_LOADNIL =  0x04;

const OP_GETTABLE = 0x07;

const OP_NEWTABLE = 0x0b;

const OP_SETTABLE = 0x0a;

const OP_SETLIST = 0x2b;


opCodes[OP_GETTABUP] = getOpInfo(0, 1, OpArgU, OpArgK, IABC, "GETTABUP", _getTabUp);
opCodes[OP_LOADK] = getOpInfo(0, 1, OpArgK, OpArgN, IABx, "LOADK", _loadK);
opCodes[OP_CALL] = getOpInfo(0, 1, OpArgU, OpArgU, IABC, "CALL", _call);
opCodes[OP_RETURN] = getOpInfo(0, 0, OpArgU, OpArgN, IABC, "RETURN", _return);
opCodes[OP_ADD] = getOpInfo(0, 1, OpArgK, OpArgK, IABC, "ADD", _add);
opCodes[OP_TEST] = getOpInfo(1, 0, OpArgN, OpArgU, IABC, "TEST", _test);
opCodes[OP_JMP] = getOpInfo(0, 0, OpArgR, OpArgN, IAsBx, "JMP", _jmp);
opCodes[OP_CLOSURE] = getOpInfo(0, 1, OpArgU, OpArgN, IABx, "CLOSURE", _closure);
opCodes[OP_SETTABUP] = getOpInfo(0, 0, OpArgK, OpArgK, IABC, "SETTABUP", _settabup);
opCodes[OP_EQ] = getOpInfo(1, 0, OpArgK, OpArgK, IABC, "EQ", _eq);

opCodes[OP_LOADBOOL] = getOpInfo(1, 0, OpArgU, OpArgU, IABC, "LOADBOOL", _loadBool);
opCodes[OP_MOVE] = getOpInfo(0, 1, OpArgR, OpArgN, IABC, "MOVE", _move);

opCodes[OP_GETUPVAL] = getOpInfo(0, 1, OpArgU, OpArgN, IABC, "GETUPVAL", _getUpval);

opCodes[OP_LOADNIL] = getOpInfo(0, 1, OpArgU, OpArgN, IABC, "LOADNIL", _loadNil);

opCodes[OP_GETTABLE] = getOpInfo(0, 1, OpArgR, OpArgK, IABC, "GETTABLE", _getTable);

opCodes[OP_NEWTABLE] = getOpInfo(0, 1, OpArgU, OpArgU, IABC, "NEWTABLE", _newTable);

opCodes[OP_SETTABLE] = getOpInfo(0, 0, OpArgK, OpArgK, IABC, "SETTABLE", _setTable);

opCodes[OP_SETLIST] = getOpInfo(0, 0, OpArgU, OpArgU, IABC, "SETLIST", _setlist);


const LUAI_MAXSTACK = 1000000;
const LUA_REGISTRYINDEX = -LUAI_MAXSTACK - 1000;

function luaUpvalueIndex(i)
{
    return LUA_REGISTRYINDEX - i;
}

function _pushFuncAndArgs(a, b, ls)
{
    if (b >= 1)
    {
        //ls.checkStack(b)
        for (let i = a; i < a+b; i++)
        {
            //console.log("_pushFuncAndArgs", ls.stack.slots[i]);
            ls.pushValue(i);//压入函数和函数参数
        }

        return b - 1;
    }
    else
    {
        throw "_pushFuncAndArgs error";
    }
}

function _popResults(a, c, ls)
{
    if (c == 1)
    {
        //无动作
    }
    else if (c > 1)
    {
        for (let i = a + c - 2; i >= a; i--)
        {
            ls.replace(i);
        }
    }
    else
    {
        throw "_popResults == 0 error";
    }
}

function _getTabUp(inst, ls)
{
    //console.log("_getTabUp");
    let i = inst.abc();

    let a = i.a + 1;
    let b = i.b + 1;
    let c = i.c;

    //console.log(a,b,c);

    ls.getRK(c);//得到key
    ls.getTable(luaUpvalueIndex(b));//得到全局表
    ls.replace(a);
}

function _loadK(inst, ls)
{
    let i = inst.abx();
    let a = i.a + 1;
    let bx = i.bx;

    ls.getConst(bx);
    ls.replace(a);
}

function _call(inst, ls)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b;
    let c = i.c;

    let nArgs = _pushFuncAndArgs(a, b, ls);
    //console.log("nArgs", nArgs);
    ls.call(nArgs, c-1);
    _popResults(a, c, ls);
}

function _return(inst, ls)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b;

    if (b == 1)
    {
        //无返回值，什么也不做
    }
    else if (b > 1)
    {
        //有b-1个参数
        //ls.checkStack(b-1);
        for (let j = a; j <= a + b - 2; j++)
        {
            ls.pushValue(j);
        }
    }
    else
    {
        throw "_return error";
    }
}

const LUA_OPADD = 0;

function _binaryArith(inst, ls, op)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b;
    let c = i.c;

    ls.getRK(b);
    ls.getRK(c);
    ls.arith(op);
    ls.replace(a);
}

function _add(inst, ls)
{
    _binaryArith(inst, ls, LUA_OPADD);
}

function _test(inst, ls)
{
    //console.log("_test");
    let i = inst.abc();

    let a = i.a + 1;
    let c = i.c;

    if (ls.toBoolean(a) != (c != 0))
    {
        ls.addPC(1);
    }
}

function _jmp(inst, ls)
{
    let i = inst.asbx();
    let a = i.a;
    let sbx = i.sbx;

    ls.addPC(sbx);
    if (a != 0)
    {
        throw "jmp error";
    }
}

function _closure(inst, ls)
{
    //console.log("_closure");
    let i = inst.abx();

    let a = i.a + 1;
    let bx = i.bx;

    ls.loadProto(bx);
    ls.replace(a);
}

function _settabup(inst, ls)
{
    //console.log("_settabup");
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b;
    let c = i.c;

    ls.getRK(b);
    ls.getRK(c);
    ls.setTable_(luaUpvalueIndex(a));
}

const LUA_OPEQ = 0;

function _eq(inst, ls)
{
    //console.log("_eq");
    _compare(inst, ls, LUA_OPEQ);
}

function _loadBool(inst, ls)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b;
    let c = i.c;

    ls.pushBoolean(b != 0);
    ls.replace(a);
    if (c != 0)
    {
        ls.addPC(1);
    }
}

function _move(inst, ls)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b + 1;
    
    ls.copy(b, a);
}

function _getUpval(inst, ls)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b + 1;
    
    ls.copy(luaUpvalueIndex(b), a);
}

function _loadNil(inst, ls)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b;

    ls.pushNil();

    for (let j = a; j <= a+b; j++)
    {
        ls.copy(-1, j);
    }

    ls.pop(1);
}

function _getTable(inst, ls)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b + 1;
    let c = i.c;

    ls.getRK(c);
    ls.getTable(b);
    ls.replace(a);
}

function _newTable(inst, ls)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b;
    let c = i.c;

    ls.createTable(fb2int(b), fb2int(c));
    ls.replace(a);
}

function _setTable(inst, ls)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b;
    let c = i.c;

    ls.getRK(b);
    ls.getRK(c);
    ls.setTable_(a);
}

const LFIELDS_PER_FLUSH = 50;

function _setlist(inst, ls)
{
    let i = inst.abc();
    let a = i.a + 1;
    let b = i.b;
    let c = i.c;

    if (c > 0)
    {
        c--;
    }
    else
    {
        throw "_setlist error";
    }

    let idx = c * LFIELDS_PER_FLUSH;

    for (let j = 1; j <= b; j++)
    {
        idx++;
        ls.pushValue(a + j);
        ls.setI(a, idx);
    }
}

function _compare(inst, ls, op)
{
    let i = inst.abc();

    let a = i.a;
    let b = i.b;
    let c = i.c;

    ls.getRK(b);
    ls.getRK(c);

    if (ls.compare(-2, -1, op) != (a != 0))
    {
        ls.addPC(1);
    }
    ls.pop(2);
}


function getOpInfo(testFlag, setAFlag, argBMode, argCMode, opMode, name, action)
{
    let i = {};
    i.testFlag = testFlag; 
    i.setAFlag = setAFlag;
    i.argBMode = argBMode;
    i.argCMode = argCMode;
    i.opMode = opMode;
    i.name = name;
    i.action = action;

    return i;
}
const MAXARG_Bx = (1<<18) - 1       // 262143
const MAXARG_sBx = MAXARG_Bx >> 1 // 131071

// 参数是4字节的指令
function inst(instruction)
{
    let inst = {};

    function opCode()
    {
        return instruction & 0x3F;
    }

    function ABC()
    {
        let a = instruction >> 6 & 0xFF;
        let c = instruction >> 14 & 0x1FF;
        let b = instruction >> 23 & 0x1FF;

        return {a,b,c};
    }

    function ABx()
    {
        let a = instruction >> 6 & 0xFF;
        let bx = (instruction >> 14) & 0x3FFFF;

        return {a,bx};
    }

    

    function AsBx()
    {
        let i = inst.abx();
        let a = i.a;
        //console.log("i.bx ", i.bx, MAXARG_sBx);
        let sbx = i.bx - MAXARG_sBx;
        return {a, sbx};
    }

    function execute(ls)
    {
        let action = opCodes[inst.opCode()].action;

        action(inst, ls);
    }

    inst.instruction = instruction;
    inst.opCode = opCode;
    inst.OpInfo = opCodes[opCode()];
    inst.abc = ABC;
    inst.abx = ABx;
    inst.asbx = AsBx;
    inst.execute = execute;

    return inst;
}

function printOperands(inst)
{
    let OpInfo = inst.OpInfo;
    let out = "";
    out += inst.OpInfo.name + " ";
    switch (OpInfo.opMode) {
        case IABC:
            
            let val = inst.abc();
            let a = val.a;
            let b = val.b;
            let c = val.c;

            out += a;
            

            if (OpInfo.argBMode != OpArgN)
            {
                if (b > 0xff)
                {
                    //console.log(" %d", -1-(b&0xff));
                    out += (" " + (-1-(b&0xff)));
                }
                else
                {
                    //console.log(" %d", b);
                    out += (" " + b);
                }

                //console.log(out);
            }

            if (OpInfo.argCMode != OpArgN)
            {
                if (c > 0xff)
                {
                    //console.log(" %d", -1-(c&0xff));
                    out += (" " + (-1-(c&0xff)));
                }
                else
                {
                    //console.log(" %d", c);
                    out += (" " + c);
                }
            }
            console.log(out);
            break;

        case IABx:
            let val_ = inst.abx();
            let a_ = val_.a;
            let bx = val_.bx;

            out += a_;
            //console.log(a_);

            if (OpInfo.argBMode == OpArgK)
            {
                //console.log(" %d", -1-bx);
                out += (" " + (-1-bx));
            }
            else if (OpInfo.argBMode == OpArgU)
            {
                //console.log(" %d", bx);
                out += (" " + bx);
            }
            console.log(out);
            break;

        case IAsBx:
            let va = inst.asbx();
            let aa = va.a;
            let sbx = va.sbx;

            console.log(out + aa + " " + sbx);
            break;
    
        default:
            break;
    }
}

function printCode(proto)
{
    for(let i = 0; i < proto.Code.length; i++)
    {
        let code = proto.Code[i];
        let inst_ = inst(code);

        //打印指令码参数
        printOperands(inst_);
    }
}

//////////////////////////////////////////////////
function newLuaStack(size, state)
{
    let t = {};

    t.slots = new Array(size);
    t.top = 0;
    t.prev = null;
    t.pc = 0;
    t.state = state;

    t.push = function(val)
    {
        if (t.top == t.slots.length)
        {
            throw "newLuaStack full";
        }
        //console.log("stack push value:", val);
        t.slots[t.top] = val;
        t.top++;
    }

    t.pop = function()
    {
        if (t.top < 1)
        {
            throw "newLuaStack empty";
        }

        t.top--;

        let val = t.slots[t.top];
        t.slots[t.top] = null;

        //console.log("stack pop value :", val);

        return val;
    }

    t.absIndex = function(idx)
    {
        if (idx >= 0)
        {
            return idx;
        }

        return idx + t.top + 1;
    };

    t.get = function(idx)
    {
        if (idx < LUA_REGISTRYINDEX)//访问的是upvalues
        {
            let uvIdx = LUA_REGISTRYINDEX - idx - 1;
            let c = t.closure;

            if (c == null || uvIdx >= c.upvals.length)
            {
                return null;
            }

            return c.upvals[uvIdx];//注意load（）时候upvals要先赋值！！！
        }

        if (idx == LUA_REGISTRYINDEX)
        {
            return t.state.registry;
        }


        let absIndex_ = t.absIndex(idx);

        if (absIndex_ > 0 && absIndex_ <= t.top)
        {
            return t.slots[absIndex_-1];
        }
        else
        {
            return null;
        }
    };

    t.set = function(idx, val)
    {
        //LUA_REGISTRYINDEX相关先不处理
        let absIdx = t.absIndex(idx);
        if (absIdx > 0 && absIdx <= t.top)
        {
            t.slots[absIdx-1] = val;
            return;
        }

        throw "stack set error";
    };

    t.popN = function(n)
    {
        let vals = new Array(n);

        for (let i = n-1; i >= 0; i--)
        {
            vals[i] = t.pop();
        }

        return vals;
    };

    t.pushN = function(vals, n)
    {
        let len = vals.length;

        if (n < 0)
        {
            n = len;
        }

        for (let i = 0; i < n; i++)
        {
            if (i < len)
            {
                t.push(vals[i]);
            }
            else
            {
                t.push(null);
            }
        }
    };

    return t;
}

const LUA_RIDX_GLOBALS = 2;
const LUA_MINSTACK = 20;

//创建表格对象
function newLuaTable(nArr, nRec)
{
    let i = {};

    i.arr = new Array(nArr);
    i._map = new Map();

    i.put = function (key, val)
    {
        if (typeof(key) === 'number')
        {
            if (key >= 1)
            {
                if (key <= nArr)
                {
                    i.arr[key-1] = val;//如果在数组的范围内，直接写
                    return;
                }

                if (key == i.arr.length + 1)
                {
                    //如果map中有该项，则删除，没有，也删除，不会有什么影响
                    i._map.delete(key);

                    i.arr.push(val);//如果大小比数组大1，加到数组的尾部
                }
            }
        }

        i._map.set(key, val);
    };

    i.get = function(key)
    {
         //如果key是整数，且在数组的范围内，则访问数组，反之访问map
        if (typeof(key) === 'number')
        {
            if (key >= 1 && key <= i.arr.length)
            {
                return i.arr[key - 1];
            }
        }

        return i._map.get(key);
    };

    return i;
}

function newLuaClosure(proto)
{
    let c = {};
    c.proto = proto;

    //console.log("ls.loadProto",proto.Upvalues)

    //支持upvalues
    if (proto.Upvalues.length > 0)
    {   
        c.upvals = new Array(proto.Upvalues.length);
    }

    return c;
}

function newJsClosure(jsFunction, nUpvals)
{
    let c = {};
    c.jsFunction = jsFunction;

    //支持upvalues
    if (nUpvals > 0)
    {   
        c.upvals = new Array(nUpvals);
    }

    return c;
}

function convertToBoolean(val)
{
    return Boolean(val);
}

function newLuaState()
{
    let ls = {};
    ls.registry = newLuaTable(0, 0);
    ls.registry.put(LUA_RIDX_GLOBALS, newLuaTable(0, 0));
    ls.stack = null;

    ls.pop = function(n)
    {
        ls.stack.popN(n);
    };

    ls.compare = function(idx1, idx2, op)
    {
        let a = ls.stack.get(idx1);
        let b = ls.stack.get(idx2);

        //暂时只支持==
        if (op == LUA_OPEQ)
        {
            return (a == b);
        }
        else
        {
            throw "ls.compare error";
        }
    };

    //将子函数载入栈中
    ls.loadProto = function(idx)
    {
        let subProto = ls.stack.closure.proto.Protos[idx];

        let closure = newLuaClosure(subProto);

        //console.log("ls.loadProto",subProto.Upvalues)
        ls.stack.push(closure);

        //支持upvalue
        for (let i = 0; i < subProto.Upvalues.length; i++)
        {
            let uvIdx = subProto.Upvalues[i].Idx;

            if (subProto.Upvalues[i].Instack == 1)
            {
                //throw "loadProto unsupport";
                closure.upvals[i] = ls.stack.slots[uvIdx];//支持绑定局部变量
            }
            else
            {
                closure.upvals[i] = ls.stack.closure.upvals[uvIdx];
            }
        }
    };

    ls.addPC = function(n)
    {
        ls.stack.pc += n;
    };

    ls.toBoolean = function (idx)
    {
        let val = ls.stack.get(idx);
        return convertToBoolean(val);
    };

    ls.replace = function(idx)
    {
        let val = ls.stack.pop();
        ls.stack.set(idx, val);
    };

    ls.getTable_ = function(t, k, raw)
    {
        //将t的k键压入lua栈
        let v = t.get(k);

        if (v == undefined)
        {
            v = null;
        }

        ls.stack.push(v);
    };

    ls.getTable = function(idx)
    {
        let t = ls.stack.get(idx);//需要修改get函数，使得能访问全局表
        
        let k = ls.stack.pop();
        
        return ls.getTable_(t, k, false);
    };

    ls.getConst = function (idx)
    {
        let c = ls.stack.closure.proto.Constants[idx];
        ls.stack.push(c);
    };

    ls.pushValue = function (idx)
    {
        let c = ls.stack.get(idx);
        ls.stack.push(c);
    };

    ls.getRK = function (rk)
    {
        if (rk > 0xff)
        {
            ls.getConst(rk & 0xff);//得到常量表内容
        }
        else
        {
            ls.pushValue(rk + 1);//得到寄存器内容
        }
    };
    

    ls.pushLuaStack = function (stack)
    {
        stack.prev = ls.stack;
        ls.stack = stack;
    };

    ls.popLuaStack = function ()
    {
        let stack = ls.stack;
        ls.stack = stack.prev;
        stack.prev = null;
    };

    ls.load = function(fileData, chunkName, mode)
    {
        //只支持载入虚拟机文件
        let proto;
        if (proto_ == null)
        {
            proto = unDump(fileData);
        }
        else
        {
            proto = proto_;
        }
        

        let c = newLuaClosure(proto);

        ls.stack.push(c);

        //设置upvals
        if (proto.Upvalues.length > 0)
        {
            let env = ls.registry.get(LUA_RIDX_GLOBALS);//得到全局表
            c.upvals[0] = env;
        }

        return 0;
    };

    ls.setTable_ = function(idx)
    {
        let t = ls.stack.get(idx);
        let v = ls.stack.pop();
        let k = ls.stack.pop();

        ls.setTable(t, k, v, false);
    };

    //设置表格t的键k为值v
    ls.setTable = function(t, k, v, raw)
    {
        t.put(k, v);
    };

    ls.pushJsFunction = function(jsFunction)
    {
        ls.stack.push(newJsClosure(jsFunction, 0));
    };

    ls.setGlobal = function(name)
    {
        let t = ls.registry.get(LUA_RIDX_GLOBALS);//得到全局表

        let v = ls.stack.pop();//弹出函数

        //console.log("set global :", name, v);
        ls.setTable(t, name, v, false);//设置全局表
    };

    //注册函数
    ls.register = function(name, jsFunction)
    {
        ls.pushJsFunction(jsFunction);
        ls.setGlobal(name);
    };

    //调用js函数
    ls.callJsClosure = function(nArgs, nResults, c)
    {
        let newStack = newLuaStack(nArgs + 20);
        newStack.closure = c;

        let args = ls.stack.popN(nArgs);
        newStack.pushN(args, nArgs);
        ls.stack.pop();

        ls.pushLuaStack(newStack);
        let r = c.jsFunction(ls);//运行js函数
        ls.popLuaStack();

        if (nResults != 0)
        {
            let results = newStack.popN(r);
            //ls.stack.check(results.length);
            ls.stack.pushN(results, nResults);
        }
    };

    //调用lua函数
    ls.callLuaClosure = function(nArgs, nResults, c)
    {
        let nRegs = c.proto.MaxStackSize;
        let nParams = c.proto.NumParams;//需要修改这个地方，不然会得到undefined

        let isVararg = c.proto.IsVararg == 1;

        let newStack = newLuaStack(nRegs + 20);//新建运行栈
        newStack.closure = c;

        ////////////////////////////////////////////////
        let funcAndArgs = ls.stack.popN(nArgs + 1);//弹出函数和参数
        funcAndArgs.splice(0, 1)//去除函数
        newStack.pushN(funcAndArgs, nParams);//压入参数

        newStack.top = nRegs;

        if (nArgs > nParams && isVararg)
        {
            throw "callLuaClosure error";
        }

        ls.pushLuaStack(newStack);
        ls.runLuaClosure();//运行函数
        ls.popLuaStack();

        if (nResults != 0)
        {
            //如果有返回值，将返回值复制到调用函数顶部
            let results = newStack.popN(newStack.top - nRegs);

            //ls.stack.check(results.length)检查调用栈是否够

            ls.stack.pushN(results, nResults);

        }
    };


    //调用js函数
    ls.fetch = function()
    {
        let i = ls.stack.closure.proto.Code[ls.stack.pc];
        ls.stack.pc++;

        return i;
    };
    

    const OP_RETURN = 0x26;
    //调用js函数
    ls.runLuaClosure = function()
    {
        while(1)
        {
            let code = ls.fetch();//得到要执行的指令
            let inst_ = inst(code);//解码指令

            inst_.execute(ls);//执行指令

            if (inst_.opCode() == OP_RETURN)//如果是return语句，退出执行
            {
                break;
            }
        }
    };

    ls.call = function(nArgs, nResults)
    {
        //弹出栈里元素--函数
        let c = ls.stack.get(-(nArgs + 1));

        //调用函数，有两种情况，js函数和lua函数
        if (c.proto)
        {
            ls.callLuaClosure(nArgs, nResults, c);
        }
        else
        {
            ls.callJsClosure(nArgs, nResults, c);
        }
    };

    ls.pushInteger = function(n)
    {
        ls.stack.push(n);
    };

    ls.pushBoolean = function(b)
    {
        ls.stack.push(b);
    };

    ls.arith = function(op)
    {
        //只处理加法指令
        let a,b;
        b = ls.stack.pop();
        a = ls.stack.pop();

        ls.stack.push(a+b);
    };

    ls.copy = function(fromIdx, toIdx)
    {
        let val = ls.stack.get(fromIdx);
        ls.stack.set(toIdx, val);
    }

    ls.pushNil = function()
    {
        ls.stack.push(null);
    }

    ls.createTable = function(nArr, nRec)
    {
        let t = newLuaTable(nArr, nRec);
	    ls.stack.push(t);
    }

    ls.setI = function(idx, i)
    {
        let t = ls.stack.get(idx);
        let v = ls.stack.pop();
        ls.setTable(t, i, v);
    }

    ls.pushLuaStack(newLuaStack(LUA_MINSTACK, ls));

    return ls;
}


//////////////////////////////////////////////////

function print(ls)
{
    //得到传来的参数
    console.log("Jsprint:",ls.stack.pop());
    
    return 0;
}

function setValue(ls)
{
    //console.log("setValue()");

    let val = ls.stack.pop();
    let button = ls.stack.pop();

    button.value[0] = val;

    //如果是button类型，调用发送通信请求
    if (button.type == "button")
    {
      //调用设备通信函数，进行通信
      devWriteCommu(button, (data)=>{
        let tmp;
        if (tmp = jsonParse(data))
        {
            if(tmp.result == "ok")
            {
                //console.log("脚本" + "成功");
            }
        }
      });
    }

    return 0;
}

let ls;
let fileData_;
let proto_ = null;

//sysctl中收集到所有需要的变量的值了，会调用这个函数运行脚本
//暂时支持一台设备
function runLua(showThings)
{
    //console.log("runLua", showThings);
    for (let i = 0; i < showThings.length; i++)
    {
        let showThing = showThings[i];

        //取出showThing的name和值，设置全局变量
        ls.pushInteger(Number(showThing.value));//入栈一个整数
        ls.setGlobal(showThing.name);//将栈顶的数据出栈到lua全局变量区  
    }

    ls.load(fileData_, "any", "bt");

    ls.call(0, 0);
}


///////////////////////////////////////////////////////////////////////////
//词法分析
const TOKEN_EOF = 0;//结束符
const TOKEN_KW_FUNCTION = 1;//function
const TOKEN_IDENTIFIER = 2;//标识符
const TOKEN_SEP_LPAREN = 3;//(
const TOKEN_SEP_RPAREN = 4;//)
const TOKEN_KW_IF = 5;//if
const TOKEN_OP_ADD = 6;//+
const TOKEN_OP_EQ = 7;//==
const TOKEN_NUMBER = 8;//数字
const TOKEN_KW_THEN = 9;//then
const TOKEN_SEP_COMMA = 10;//,
const TOKEN_KW_ELSE = 11;//else
const TOKEN_KW_END = 12;//end
const TOKEN_KW_RETURN = 13;//return

const TOKEN_OP_ASSIGN = 14;//=
const TOKEN_KW_LOCAL = 15;//local

const TOKEN_SEP_DOT = 16;//.

const TOKEN_SEP_LCURLY = 17;//{
const TOKEN_SEP_RCURLY = 18;//}
const TOKEN_SEP_LBRACK = 19;//[
const TOKEN_SEP_RBRACK = 20;//]

const TOKEN_STRING = 21;//"内容"或者'内容'

let keywords = new Map();
keywords.set("function", TOKEN_KW_FUNCTION);
keywords.set("if", TOKEN_KW_IF);
keywords.set("then", TOKEN_KW_THEN);
keywords.set("else", TOKEN_KW_ELSE);
keywords.set("end", TOKEN_KW_END);
keywords.set("local", TOKEN_KW_LOCAL);

keywords.set("return", TOKEN_KW_RETURN);

function newLexer(chunk, chunkName)
{
    let i = {};
    let count = 0;
    let line = 1;

    i.chunk = chunk;
    i.chunkName = chunkName;
    i.line = line;//从第一行开始
    i.count = count;//指向chunk字符的指针

    i.nextTokenLine = 0;
    i.nextTokenKind = 0;
    i.nextToken_ = "";

    i.nextIdentifier = function()
    {
        return i.nextTokenOfKind(TOKEN_IDENTIFIER);
    }

    i.nextTokenOfKind = function(kind)
    {
        let token = i.nextToken();

        if (token.kind != kind)
        {
            throw "syntax error near " + token.kind + ' ' + kind;
        }

        return {line:token.line, token:token.token};
    }

    i.lookAhead = function()
    {
        //只查看，不改变line的值
        if (i.nextTokenLine > 0)
        {   
            return i.nextTokenKind;
        }

        let currentLine = i.line;
        let token = i.nextToken();

        i.line = currentLine;
        i.nextTokenLine = token.line;
        i.nextTokenKind = token.kind;
        i.nextToken_ = token.token;
        return token.kind;
    }

    i.isWhiteSpace = function(c)
    {
        switch (c) {
            case '\t':
                return true;
                break;
        
            default:
                break;
        }

        return false;
    }

    //跳过空白字符，如空格和换行符
    i.skipWhiteSpaces = function ()
    {
        while(1)
        {
            if (chunk[count] == ' ')
            {
                i.next(1);
            }
            else if (chunk[count] == '\r' && chunk[count + 1] == '\n')
            {
                i.next(2);
                line++;
            }
            else if (i.isWhiteSpace(chunk[count]))
            {
                i.next(1);
                break;
            }
            else
            {
                break;
            }
        }
    }

    i.next = function(n)
    {
        count += n;
    }

    i.isDigit = function(n)
    {
        return n >= '0' && n <= '9';
    }

    i.scanNumber = function(n)
    {
        //只支持整数
        let num;
        let countStart = count;

        while(chunk[count] >= '0' && chunk[count] <= '9')
        {
            i.next(1);
        }

        num = chunk.substring(countStart, count);

        return num;
    }

    i.isLetter = function(n)
    {
        return (n >= 'a' && n <= 'z') || (n >= 'A' && n <= 'Z');
    }

    i.scanIdentifier = function()
    {
        //返回扫描得到的标识符
        //只支持字母表示的标识符
        let identifier;
        let countStart = count;

        while((chunk[count] >= 'a' && chunk[count] <= 'z') || 
        (chunk[count] >= 'A' && chunk[count] <= 'Z') || (chunk[count] == '_'))
        {
            i.next(1);
        }

        identifier = chunk.substring(countStart, count);
        //console.log(identifier);
        return identifier;
    }

    i.scanShortString = function()
    {
        let startL = chunk[count];

        i.next(1);

        let countStart = count;

        //读到'或者"结束
        while(chunk[count] != startL)
        {
            i.next(1);
        }

        shortString = chunk.substring(countStart, count);
        i.next(1);//跳过结尾的符号'或者"
        console.log("shortString", shortString);
        return shortString;
    }

    //返回行号，token类型，token
    i.nextToken = function ()
    {
        if (i.nextTokenLine > 0)
        {
            let line = i.nextTokenLine;
            let kind = i.nextTokenKind;
            let token = i.nextToken_;

            i.line = i.nextTokenLine;
            i.nextTokenLine = 0;
            //console.log(4444);
            return {line, kind, token};
        }

        i.skipWhiteSpaces();

        //到达最后字符了，直接返回
        if (count == chunk.length)
        {
            return {line, kind:TOKEN_EOF, token:"EOF"};
        }

        switch (chunk[count]) {
            case '(':
                i.next(1);
                return {line, kind:TOKEN_SEP_LPAREN, token:"("};
            break;

            case ')':
                i.next(1);
                return {line, kind:TOKEN_SEP_RPAREN, token:")"};
            break;

            case '+':
                i.next(1);
                return {line, kind:TOKEN_OP_ADD, token:"+"};
            break;

            case '=':
                if ((count + 1 != chunk.length) && (chunk[count + 1] == '=')) 
                {
                    i.next(2);
                    return {line, kind:TOKEN_OP_EQ, token:"=="};
                } 
                else 
                {
                    i.next(1);
                    return {line, kind:TOKEN_OP_ASSIGN, token:"="};
                }

            break;

            case ',':
                i.next(1);
                return {line, kind:TOKEN_SEP_COMMA, token:","};
            break;

            case '.':
                i.next(1);
                return {line, kind:TOKEN_SEP_DOT, token:"."};
                break;

            case '{':
                i.next(1);
                return {line, kind:TOKEN_SEP_LCURLY, token:"{"};
                break;

            case '}':
                i.next(1);
                return {line, kind:TOKEN_SEP_RCURLY, token:"}"};
                break;

            case '[':
                i.next(1);
                return {line, kind:TOKEN_SEP_LBRACK, token:"["};
                break;

            case ']':
                i.next(1);
                return {line, kind:TOKEN_SEP_RBRACK, token:"]"};
                break;

            case '\'':
            case '"' :
                return {line, kind:TOKEN_STRING, token:i.scanShortString()}; ;
                break;

            default:
                break;
        }

        //判断是否是数字
        let c = i.chunk[count];

        if (i.isDigit(c))
        {
            let token = i.scanNumber();

            return {line, kind:TOKEN_NUMBER, token:token};
        }

        //判断是否是标识符或关键字
        if ((c == '_') || i.isLetter(c))
        {
            let token = i.scanIdentifier();
            //console.log("keywords[token]", keywords.get(token), token);

            if (keywords.get(token))
            {
                return {line, kind:keywords.get(token), token:token};
            }
            else
            {
                return {line, kind:TOKEN_IDENTIFIER, token:token};
            }
        }

        throw "unexpected symbol near" + c;
    };

    return i;
}
/////////////////////////////////
//语法分析

function newBlock(stats, retExps, lastLine)
{
    let i = {};
    
    i.stats = stats;
    i.retExps = retExps;
    i.lastLine = lastLine;

    return i;
}

function newIfStat(exps, blocks)
{
    let i = {};

    i.exps = exps;
    i.blocks = blocks;

    i.type = "IfStat";//for代码生成

    return i;
}

function newLocalValDeclStat(lastline, nameList, expList)
{
    let i = {};

    i.lastline = lastline;
    i.nameList = nameList;
    i.expList = expList;

    i.type = "LocalValDeclStat";//for代码生成

    return i;
}


function binOpExp(line, op, exp1, exp2)
{
    let i = {};

    i.line = line;
    i.op = op;
    i.exp1 = exp1;
    i.exp2 = exp2;

    i.type = "BinopExp";

    return i;
}

//解析block
function parseBlock(lexer)
{
    return newBlock(parseStats(lexer),
                    parseRetExps(lexer),
                    lexer.line);
}

function isBlockEnd(tokenKind)
{
    console.log("tokenKind:" + tokenKind);
    switch (tokenKind) {
        case TOKEN_EOF:
        case TOKEN_KW_END:
        case TOKEN_KW_ELSE:
        case TOKEN_KW_RETURN:
            return true;
            break;
    
        default:
            break;
    }

    return false;
}

function trueExp(line)
{
    let i = {};

    i.line = line;

    i.type = "TrueExp";

    return i;
}

function integerExp(line, val)
{
    let i = {};

    i.line = line;
    i.val = val;

    i.type = "IntegerExp";

    return i;
}

function FloatExp(line, val)
{
    let i = {};
    
    i.line = line;
    i.val = val;

    i.type = "FloatExp";

    return i;
}

function parseNumberExp(lexer)
{
    function isInt(n) 
    {
        return typeof n === 'number' && n % 1 == 0;
    }

    let i = lexer.nextToken();
    let line = i.line;
    let token = i.token;

    let number = Number(token);

    if (isInt(number))
    {
        //是整数
        return integerExp(line, number);
    }
    else
    {
        //是浮点数
        return FloatExp(line, number);
    }
}

function tableConstructorExp(line, lastLine, keyExps, valExps)
{
    let i = {};

    i.type = "TableConstructorExp";

    i.line = line;
    i.lastLine = lastLine;
    i.keyExps = keyExps;
    i.valExps = valExps;

    return i;
}

function _isFieldSep(tokenKind)
{
    return tokenKind == TOKEN_SEP_COMMA;//如果是逗号，返回真
}

function _parseField(lexer)
{
    let exp = parseExp(lexer);

    if (exp.type == "NameExp")
    {
        if (lexer.lookAhead() == TOKEN_OP_ASSIGN)
        {
            lexer.nextToken();//跳过=

            let k = stringExp(exp.line , exp.name);
            let v = parseExp(lexer);

            return {k, v};
        }
    }
    
    return {k:null, v:exp}; 
}

function _parseFildList(lexer)
{
    let ks = [], vs = [];
    if (lexer.lookAhead() != TOKEN_SEP_RCURLY)//不为空
    {
        let kv = _parseField(lexer);
        ks.push(kv.k);
        vs.push(kv.v);

        while(_isFieldSep(lexer.lookAhead()))//如果是，
        {
            lexer.nextToken();//跳过token
            if (lexer.lookAhead() != TOKEN_SEP_RCURLY)
            {
                let kv = _parseField(lexer);
                ks.push(kv.k);
                vs.push(kv.v);
            }
            else
            {
                break;
            }
        }
    }
    return {keyExps:ks, valExps:vs};
}

function parseTableConstructorExp(lexer)
{
    let line = lexer.line;
    lexer.nextTokenOfKind(TOKEN_SEP_LCURLY);//确保是{
    let exps = _parseFildList(lexer);
    lexer.nextTokenOfKind(TOKEN_SEP_RCURLY);//却表是}
    let lastLine = lexer.line;

    return tableConstructorExp(line, lastLine, exps.keyExps, exps.valExps);
}

function primary(lexer) 
{
    //只支持标识符和数字，表
    switch (lexer.lookAhead()) 
    {
        case TOKEN_NUMBER:
            return parseNumberExp(lexer);//数字
            break;

        case TOKEN_SEP_LCURLY:
            return parseTableConstructorExp(lexer);
            break;

        case TOKEN_STRING:
            let token_ = lexer.nextToken();
            return stringExp(token_.line, token_.token);
            return ;
            break

        default:
            break;
    }

    return parsePrefixExp(lexer);//标识符
}

function factor(lexer) 
{
    let expr = primary(lexer);

    while (1) 
    {
        switch (lexer.lookAhead()) 
        {
            case TOKEN_OP_ADD:
                let i = lexer.nextToken();
                let line = i.line;
                let op = i.kind;

                expr = binOpExp(line, op, expr, primary(lexer));
                break;
        
            default:
                return expr;
        }
    }

    return expr;
}

function term(lexer) 
{
    let expr = factor(lexer);

    while (1) 
    {
        switch (lexer.lookAhead()) 
        {
            case TOKEN_OP_EQ:
                let i = lexer.nextToken();
                let line = i.line;
                let op = i.kind;

                expr = binOpExp(line, op, expr, factor(lexer));
                break;
        
            default:
                return expr;
        }
    }

    return expr;
}

//解析表达式
//暂时只支持加法,等于判断，表
function parseExp(lexer)
{
    return term(lexer);
}

//解析if语句
function parseIfstat(lexer)
{
    lexer.nextTokenOfKind(TOKEN_KW_IF);//确定开头是IF

    let exps = [];
    let blocks = [];

    exps.push(parseExp(lexer));
    
    //console.log("if cond:", exps[0]);

    lexer.nextTokenOfKind(TOKEN_KW_THEN);//确定表达式之后是THEN
    
    blocks.push(parseBlock(lexer));//解析满足if条件的语句
    //console.log("333", blocks);

    //处理else，我们先不支持elseif
    if (lexer.lookAhead() == TOKEN_KW_ELSE)
    {
        //console.log(3);
        lexer.nextToken();//跳过else

        exps.push(trueExp(lexer.line));//插入true表达式

        blocks.push(parseBlock(lexer));//解析满足else条件的语句
        //console.log(4);
    }

    lexer.nextTokenOfKind(TOKEN_KW_END);//确定以end结尾

    return newIfStat(exps, blocks);
}

function nameExp(line, name)
{
    let i = {};
    i.line = line;
    i.name = name;

    i.type = "NameExp";

    return i;
}

function funcCallExp(line, lastLine, prefixExp, args)
{
    let i = {};

    i.line = line;
    i.lastLine = lastLine;
    i.prefixExp = prefixExp;
    i.args = args;

    i.type = "FuncCallExp";

    return i;
}

function parseExpList(lexer)
{
    let exps = [];

    exps.push(parseExp(lexer));

    while(lexer.lookAhead() == TOKEN_SEP_COMMA)//如果是逗号分隔
    {
        lexer.nextToken()//跳过逗号
        exps.push(parseExp(lexer));
    }

    return exps;
}

//解析函数参数
function _parseArgs(lexer)
{
    let args = [];

    switch (lexer.lookAhead()) {
        case TOKEN_SEP_LPAREN:
            lexer.nextToken();//跳过(

            if (lexer.lookAhead() != TOKEN_SEP_RPAREN)
            {
                //说明有参数
                args = parseExpList(lexer);
            }

            lexer.nextTokenOfKind(TOKEN_SEP_RPAREN);//必须以)结束
            break;
    
        default:
            break;
    }

    return args;
}

function _finishFuncCallExp(lexer, prefixExp)
{
    let line = lexer.line;

    let args = _parseArgs(lexer);

    let lastLine = lexer.line;

    return funcCallExp(line, lastLine, prefixExp, args);
}

function _finishPrefixExp(lexer, exp)
{
    while(1)
    {
        switch (lexer.lookAhead()) {
            case TOKEN_SEP_LPAREN:
                exp = _finishFuncCallExp(lexer, exp);
                break;
    
            case TOKEN_SEP_DOT:
                //console.log("TOKEN_SEP_DOT");
                lexer.nextToken();//跳过.
                let ident = lexer.nextIdentifier();
    
                let keyExp = stringExp(ident.line, ident.token);
                exp = tableAccessExp(ident.line, exp, keyExp);
                break;
    
            case TOKEN_SEP_LBRACK://[]
                lexer.nextToken();//跳过[
                let keyExp_ = parseExp(lexer);//解析表的key
                lexer.nextTokenOfKind(TOKEN_SEP_RBRACK);//确保是]
                exp = tableAccessExp(lexer.line, exp, keyExp_);
                break;
        
            default:
                return exp;
        }
    }
}

function parseParensExp(lexer)
{
    //console.log(1);
    lexer.nextTokenOfKind(TOKEN_SEP_LPAREN);
    //console.log(2);

    let exp = parseExp(lexer);

    lexer.nextTokenOfKind(TOKEN_SEP_RPAREN);

    return exp;
}

function parsePrefixExp(lexer)
{
    let exp;

    if (lexer.lookAhead() == TOKEN_IDENTIFIER)
    {
        let i = lexer.nextIdentifier();
        exp = nameExp(i.line, i.token);
    }
    else
    {
        exp = parseParensExp(lexer);//( )
    }

    return _finishPrefixExp(lexer, exp);
}

function parseAssignStat(lexer, prefixExp)
{
    let varList = [];
    let expList = [];

    varList.push(prefixExp);//暂时只支持一个变量的情况
    lexer.nextTokenOfKind(TOKEN_OP_ASSIGN);//确保为=号
    expList = parseExpList(lexer);//解析表达式

    let lastLine = lexer.line;

    return assignStat(lastLine, varList, expList);
}

//函数调用和赋值语句
function parseAssignOrFuncCallStat(lexer)
{
    //暂时只支持函数调用
    let prefixExp = parsePrefixExp(lexer);

    //扩展支持赋值语句
    if (prefixExp.type == "FuncCallExp")
    {
        return prefixExp;
    }
    else
    {
        return parseAssignStat(lexer, prefixExp);
    }
}

function _parseFuncName(lexer)
{
    let identifier = lexer.nextIdentifier();
    let exp = nameExp(identifier.line, identifier.token);//函数名表达式

    return exp;
}

function _parseParList(lexer)
{
    if (lexer.lookAhead() == TOKEN_SEP_RPAREN)
    {
        return {parList:[], isVararg:false};
    }
    else
    {
        let ident = lexer.nextIdentifier();
        let names = [];

        names.push(ident.token);

        //如果是逗号，说明还有参数，继续处理
        while(lexer.lookAhead() == TOKEN_SEP_COMMA)
        {
            lexer.nextToken()//跳过逗号
            if (lexer.LookAhead() == TOKEN_IDENTIFIER)
            {   
                //如果是标识符
                let ident = lexer.nextIdentifier();
                names.push(ident.token);
            }
            else
            {
                throw "_parseParList error";
            }
        }
        //console.log("names:", names);
        return {parList:names, isVararg:false}; 
    }
}

function funcDefExp(line, lastLine, parList, isVararg, block)
{
    let i = {};

    i.line = line;
    i.lastLine = lastLine;
    i.parList = parList;
    i.isVararg = isVararg;
    i.block = block;

    i.type = "FuncDefExp";

    return i;
}


function parseFuncDefExp(lexer)
{
    let line = lexer.line;
    lexer.nextTokenOfKind(TOKEN_SEP_LPAREN);//确保是(
    let list = _parseParList(lexer);//解析函数参数
    lexer.nextTokenOfKind(TOKEN_SEP_RPAREN);//确保是)

    let block = parseBlock(lexer);//解析函数体

    let last = lexer.nextTokenOfKind(TOKEN_KW_END);//确保是end

    return funcDefExp(line, last.line, list.parList, list.isVararg, block);
}

function assignStat(lastLine, varList, expList)
{
    let i = {};

    i.type = "AssignStat";

    i.lastLine = lastLine;
    i.varList = varList;
    i.expList = expList;

    return i;
}

//lua函数定义
function parseFuncDefStat(lexer)
{
    lexer.nextTokenOfKind(TOKEN_KW_FUNCTION);

    let fnExp = _parseFuncName(lexer);//解析函数名
    let fdExp = parseFuncDefExp(lexer);//解析函数体

    let varList = [];
    varList.push(fnExp);

    let expList = [];
    expList.push(fdExp);

    return assignStat(fdExp.line, varList, expList);//生成赋值语句
}

function _finishLocalVarDeclStat(lexer)
{
    let ident = lexer.nextIdentifier();
    let nameList = [];
    nameList.push(ident.token);//只支持一个变量名

    let expList = [];

    if (lexer.lookAhead() == TOKEN_OP_ASSIGN)
    {
        lexer.nextToken();
        expList = parseExpList(lexer);//解析表达式
    }

    let lastLine = lexer.line;

    //console.log("_finishLocalVarDeclStat", nameList, expList);

    return newLocalValDeclStat(lastLine, nameList, expList);
}

//local a = 2;
function parseLocalAssignOrFuncDefStat(lexer)
{
    lexer.nextTokenOfKind(TOKEN_KW_LOCAL);

    if (lexer.lookAhead() == TOKEN_KW_FUNCTION)
    {
        //暂时不支持local类型的函数定义
        throw "parseLocalAssignOrFuncDefStat function error";
    }
    else
    {
        return _finishLocalVarDeclStat(lexer);
    }
}

//解析语句
function parseStat(lexer)
{
    switch (lexer.lookAhead()) 
    {
        case TOKEN_KW_IF:
            return parseIfstat(lexer);
            break;

        case TOKEN_KW_FUNCTION:
		    return parseFuncDefStat(lexer);

        case TOKEN_KW_LOCAL:
            return parseLocalAssignOrFuncDefStat(lexer); 
            break;
    
        default:
		return parseAssignOrFuncCallStat(lexer);
    }
}

//解析语句
function parseStats(lexer)
{
    let stats = [];
    while(!isBlockEnd(lexer.lookAhead()))
    {
        stats.push(parseStat(lexer));
    }
    //console.log(stats);
    return stats;
}

//解析返回语句
function parseRetExps(lexer)
{
    if (lexer.lookAhead() != TOKEN_KW_RETURN)
    {
        return null;
    }

    lexer.nextToken();//跳过return关键字

    //直接解析表达式，暂时只支持一个返回值
    let exps = parseExpList(lexer);
    // if (lexer.lookAhead() == TOKEN_SEP_SEMI)
    // {
    //     lexer.NextToken();//如果有分号，跳过
    // }
    return exps;
}


//////////////////////////
//代码生成

function newlLocVarInfo(name, prev, slot, captured, scopeLv)
{
    let i = {};

    i.name = name;
    i.prev = prev;
    i.slot = slot;

    i.captured = captured;

    i.scopeLv = scopeLv;

    return i;

}

function newUpvalInfo(localVarSlot, upvalIndex, index)
{
    let i = {};

    i.localVarSlot = localVarSlot;
    i.upvalIndex = upvalIndex;
    i.index = index;

    return i;
}

//辅助代码生成
function newFuncInfo(parent, fd)
{
    let i = {};
    i.usedRegs = 0;//初始寄存器
    i.insts = [];//存储指令的数组
    i.maxRegs = 0;

    i.subFuncs = [];//支持子函数

    //支持局部变量
    i.locVars = [];
    i.locNames = new Map();
    i.scopeLv = 0;

    //支持upvalues
    i.parent = parent;
    i.upvalues = new Map();

    //支持函数带参数
    i.numParams = fd.parList.length;

    i.addLocVar = function(name)
    {
        let newVar = newlLocVarInfo(name, i.locNames.get(name),
                                    i.allocReg(), false, i.scopeLv);
        i.locVars.push(newVar);

        i.locNames.set(name, newVar);

        return newVar.slot;
    }

    i.slotOfLocVar = function(name)
    {
        let j;

        if ((j = i.locNames.get(name)) != undefined)
        {
            return j.slot;
        }

        return -1;
    }

    //寄存器分配
    i.allocReg = function ()
    {
        i.usedRegs++;

        if (i.usedRegs >= 255)
        {
            throw "too many registers";
        }

        if (i.usedRegs > i.maxRegs)
        {
            i.maxRegs = i.usedRegs;
        }

        return i.usedRegs - 1;
    }

    //释放一个寄存器
    i.freeReg = function()
    {
        i.usedRegs--;
    }

    //寄存器释放
    i.freeRegs = function(n)
    {
        for (let j = 0; j < n; j++)
        {
            i.freeReg();
        }
    }
    
    //常量表
    i.constants = new Map();

    //k为map的key，代表常量名
    i.indexOfConstant = function(k)
    {
        //如果常量名存在，返回常量索引
        let idx;
        if ((idx = i.constants.get(k)) != undefined)
        {
            return idx;
        }

        //如果键不存在，创建键值对
        idx = i.constants.size;

        i.constants.set(k, idx);

        console.log("i.constants:", i.constants);

        return idx;
    }

    //最终生成指令的函数
    i.emitABC = function(opcode, a, b, c)
    {
        let inst_ = b << 23 | c << 14 | a << 6 | opcode;
        i.insts.push(inst_);
    }

    i.emitABx = function(opcode, a, bx)
    {
        let inst_ = bx << 14 | a << 6 | opcode;
        i.insts.push(inst_);
    }

    i.emitAsBx = function(opcode, a, b)
    {
        let inst_ = (b + MAXARG_sBx) << 14 | a << 6 | opcode;
        i.insts.push(inst_);
    }

    i.emitAx = function(opcode, ax)
    {
        let inst_ = ax << 6 | opcode;
        i.insts.push(inst_);
    }

    //返回当前指令地址
    i.pc = function()
    {
        return i.insts.length - 1;
    }

    //修复jmp指令,跳转地址
    i.fixSbx = function(pc, sBx)
    {
        let inst_ = i.insts[pc];
        //console.log("old");
        //printOperands(inst(inst_));
        inst_ = inst_ & 0x3fff;
        inst_ = inst_ | ((sBx + MAXARG_sBx) << 14);
        //console.log("new jmp:");
        //printOperands(inst(inst_));
        i.insts[pc] = inst_;
    }

    //剩下的函数
    i.emitGetTabUp = function(a, b, varName)
    {
        let idx = i.indexOfConstant(varName);

        console.log("emitGetTabUp", varName, idx, i.constants);

        idx = idx | 0x100;

        i.emitABC(OP_GETTABUP, a, b, idx);
    }

    i.emitJmp = function(a, sBx)
    {
        i.emitAsBx(OP_JMP, a, sBx);
        return i.insts.length - 1;
    }

    i.emitLoadBool = function(a, b, c)
    {
        i.emitABC(OP_LOADBOOL, a, b, c);
    }
    

    i.emitBinaryOp = function(op, a, b, c)
    {
        //只支持加法和等于判断
        if (op == TOKEN_OP_ADD)
        {
            i.emitABC(OP_ADD, a, b, c);
        }
        else if (op == TOKEN_OP_EQ)
        {
            i.emitABC(OP_EQ, 1, b, c);

            i.emitJmp(0, 1);
            i.emitLoadBool(a, 0, 1);
            i.emitLoadBool(a, 1, 0);
        }
    }

    i.emitLoadK = function(a, k)
    {
        let idx = i.indexOfConstant(k);

        if (idx < (1 << 18)) 
        {
            i.emitABx(OP_LOADK, a, idx)
        } 
        else 
        {
            throw "emitLoadK error";
        }
    }

    i.emitTest = function(a, c)
    {
        i.emitABC(OP_TEST, a, 0, c);
    }

    i.emitCall = function(a, nArgs, nRet)
    {
        i.emitABC(OP_CALL, a, nArgs+1, nRet+1);
    }

    i.emitReturn = function(a, n)
    {
        i.emitABC(OP_RETURN, a, n+1, 0);
    }

    i.emitClosure = function(a, bx)
    {
        i.emitABx(OP_CLOSURE, a, bx);
    }

    i.emitSetTabUp = function(a, b, c)
    {
        i.emitABC(OP_SETTABUP, a, b, c);
    }

    i.emitMove = function(a, b)
    {
        i.emitABC(OP_MOVE, a, b, 0);
    }

    i.emitLoadNil = function(a, n)
    {
        i.emitABC(OP_LOADNIL, a, n-1, 0);
    }

    i.emitGetTable = function(a, b, c)
    {
        i.emitABC(OP_GETTABLE, a, b, c);
    }

    i.emitNewTable = function(a, nArr, nRec)
    {
        i.emitABC(OP_NEWTABLE, a, int2fb(nArr), int2fb(nRec));
    }

    i.emitSetTable = function(a, b, c)
    {
        i.emitABC(OP_SETTABLE, a, b, c)
    }

    i.emitSetList = function(a, b, c)
    {
        i.emitABC(OP_SETLIST, a, b, c);
    }

    ////////////////////////////////
    //创建Upvalues
    i.getUpvalues = function()
    {
        let upvals = [];

        for (let item of i.upvalues.keys())
        {
            let slot;
            let upvalIndex = i.upvalues.get(item).upvalIndex;

            if ((slot = i.upvalues.get(item).localVarSlot) >= 0)//如果绑定的是父的局部变量
            {
                upvals.push({Instack:1, Idx:slot});
            }   
            else
            {
                upvals.push({Instack:0, Idx:upvalIndex});//如果绑定的是父的upvalue
            }
        }

        return upvals;
    }

    i.getConstants = function()
    {
        let consts = [];
        //从map中得到从0开始的值
        let current = 0;

        for (let j = 0; j < i.constants.size; j++)
        {
            for (let item of i.constants.keys())
            {
                if (i.constants.get(item) == current)
                {
                    consts.push(item);
                    current++;
                    break;
                }
                
            }
        }

        return consts;
    }

    i.toProtos = function(fis)
    {
        let protos = [];
        for (let j = 0; j < fis.length; j++)
        {
            protos.push(fis[j].toProto());
            let fi = fis[j];
            for (let k = 0; k < fi.insts.length; k++)
            {
                let code = fi.insts[k];
                let ii = inst(code)
                
                printOperands(ii);
            }
            
        }
        console.log("protos:", protos);
        return protos;
    }

    //从fi生成支持虚拟机运行的proto
    i.toProto = function()
    {
        return {
            Source : "",
            LineDefined : 0,
            LastLineDefined : 0,
            NumParams : i.numParams,//修改这，支持函数带参数
            IsVararg : 0,
            MaxStackSize : i.maxRegs,
            Code : i.insts,
            Constants : i.getConstants(),
            Upvalues : i.getUpvalues(),
            Protos : i.toProtos(i.subFuncs),
            LineInfo : [],
            LocVars : [],
            UpvalueNames : []
        };
    }

    i.indexOfUpval = function(name)
    {
        let upval;
        if ((upval = i.upvalues.get(name)) != undefined)
        {
            //如果变量名和upvalues绑定了，直接返回
            return upval.index;
        }

        if (i.parent != null)
        {
            //只有父fi不为null，可以执行这
            let locVar;
            if ((locVar = i.parent.locNames.get(name)) != undefined)
            {
                //如果这个变量是父的局部变量
                let idx = i.upvalues.size;
                i.upvalues.set(name, newUpvalInfo(locVar.slot, -1, idx));//绑定变量名和变量的lua栈值
                
                locVar.captured = true;//设置被捕获标志

                return idx;
            }

            //如果这个变量不是父的变量，可能是祖父的变量,会被父捕获
            let uvIdx;
            if ((uvIdx = i.parent.indexOfUpval(name)) >= 0)
            {
                let idx = i.upvalues.size;
                i.upvalues.set(name, newUpvalInfo(-1, uvIdx, idx));//记录父捕获的index

                return idx;
            }
        }

        return -1;
    }

    i.emitGetUpval = function(a, b)
    {
        i.emitABC(OP_GETUPVAL, a, b, 0);
    }

    i.enterScope = function(breakable)
    {
        i.scopeLv++;
    }

    i.exitScope = function()
    {
        i.scopeLv--;
        for (let item of i.locNames.keys())
        {
            let locVar = i.locNames.get(item);

            if (locVar.scopeLv > i.scopeLv)
            {
                i.removeLocVar(locVar);
            }
        }
    }

    i.removeLocVar = function(locVar)
    {
        i.freeReg();//释放变量占用的寄存器
        if (locVar.prev == undefined)
        {
            i.locNames.delete(locVar.name);//删除这个变量
        }
        else if (locVar.prev.scope == locVar.scopeLv)
        {
            //如果当前作用域有多个同名局部变量，则全部释放
            i.removeLocVar(locVar.prev);
        }
        else
        {
            i.locNames.set(locVar.name, locVar.prev);//指向前作用域的变量
        }
    }

    return i;
}

function cgRetStat(fi, retExps)
{
    let len = retExps.length;

    if (len == 0)
    {
        fi.emitReturn(0, 0);
    }
    else if (len == 1)
    {
        //1个返回值
        let r = fi.allocReg();
        cgExp(fi, retExps[0], r, 1);//1代表如果是函数调用，有1个返回值
        fi.freeReg();

        fi.emitReturn(r, len);//生成返回指令
    }
    else
    {
        throw "cgRetStat error";
    }
}

function cgBinopExp(fi, node, a)
{
    switch (node.op) 
    {
        default:
            let b = fi.allocReg();
            cgExp(fi, node.exp1, b, 1);

            let c = fi.allocReg();
            cgExp(fi, node.exp2, c, 1);

            fi.emitBinaryOp(node.op, a, b, c);

            fi.freeRegs(2);
            break;
    }
}

function tableAccessExp(lastLine, prefixExp, keyExp)
{
    let i = {};

    i.lastLine = lastLine;
    i.prefixExp = prefixExp;
    i.keyExp = keyExp;

    i.type = "TableAccessExp";

    return i;
}

function stringExp(line, str)
{
    let i = {};

    i.line = line;
    i.str = str;

    i.type = "StringExp";

    return i;
}

function cgNameExp(fi, node, a)
{
    let r;
    if ((r = fi.slotOfLocVar(node.name)) >= 0)
    {
        //局部变量
        fi.emitMove(a, r);
    }
    else if((r = fi.indexOfUpval(node.name)) >= 0)
    {
        //upvalues
        fi.emitGetUpval(a, r);
    }
    else
    {
        //全局变量 GETTABUP
        //先访问_ENV变量，使得main中捕获这个变量
        //r = fi.indexOfUpval("_ENV");
        //fi.emitGetTabUp(a, r, node.name);
        let taExp = tableAccessExp(0, nameExp(0, "_ENV"), 
                                    stringExp(0, node.name));

        cgTableAccessExp(fi, taExp, a);
    } 
}

function prepFuncCall(fi, node, a)
{
    //console.log("node:", node);
    let nArgs = node.args.length;

    cgExp(fi, node.prefixExp, a, 1);//加载函数

    for (let i = 0; i < nArgs; i++)
    {
        let arg = node.args[i];

        let tmp = fi.allocReg();

        cgExp(fi, arg, tmp, 1);//加载函数参数，1代表1个返回值
    }

    fi.freeRegs(nArgs);

    return nArgs;
}

function cgFuncCallExp(fi, node, a, n)
{
    let nArgs = prepFuncCall(fi, node, a);
    fi.emitCall(a, nArgs, n);//生成call指令
}

//生成函数定义语句
function cgFuncDefExp(fi, node, a)
{
    console.log("cgFuncDefExp:", node);
    let subFi = newFuncInfo(fi, node);//生成子fi，最终用于生成子proto

    fi.subFuncs.push(subFi);

    for (let i = 0; i < node.parList.length; i++)
    {
        let par = node.parList[i];

        subFi.addLocVar(par);
    }

    cgBlock(subFi, node.block);//生成函数内部语句;

    subFi.emitReturn(0, 0);//在block指令后添加return语句

    let bx = fi.subFuncs.length - 1;

    fi.emitClosure(a, bx);//生成closure语句
}

function cgTableAccessExp(fi, node, a)
{
    //新增指令GATTABLE
    let b = fi.allocReg();
    cgExp(fi, node.prefixExp, b, 1);//得到表

    let c = fi.allocReg();
    cgExp(fi, node.keyExp, c, 1);//得到表的键，用LoadK从常量表中加载

    fi.emitGetTable(a, b, c);
    fi.freeRegs(2);
}

function int2fb(x)
{
    let e = 0;

    if (x < 8)
    {
        return x;
    }

    while(x >= (8 << 4))
    {
        x = (x + 0xf) >> 4;
        e += 4;
    }

    while(x >= (8 << 1))
    {
        x = (x + 1) >> 1;
        e++;
    }

    return ((e + 1) << 3) | (x - 8);
}

function fb2int(x)
{
    if (x < 8)
    {
        return x;
    }
    else
    {
        return ((x & 7) + 8) << (((x & 0xff) >> 3) - 1);
    }
}

function cgTableConstructorExp(fi, node, a)
{
    let nArr = 0;
    for (let i = 0; i < node.keyExps.length; i++)
    {
        if (node.keyExps[i] == null)
        {
            nArr++;//计算有多少项要保存到数组中
        }
    }

    fi.emitNewTable(a, nArr, node.keyExps.length - nArr);//nArr保存到数组中，剩下用map实现

    let arrIdx = 0;

    for (let i = 0; i < node.keyExps.length; i++)
    {
        let keyExp = node.keyExps[i];//取出值,为stringExp类型
        let valExp = node.valExps[i];//取出值


        if (keyExp == null)
        {
            //只有value，没有key
            //保存在数组中
            arrIdx++;

            let tmp = fi.allocReg();
            cgExp(fi, valExp, tmp, 1);//表达式求值

            if (arrIdx % 50 == 0 || arrIdx == nArr) 
            {
                //如果大于50，每50次处理一次，如果小于50，按实际次数处理
				let n = arrIdx % 50;

				if (n == 0) 
                {
					n = 50;
				}

				fi.freeRegs(n);

				let c = (arrIdx-1)/50 + 1;

				fi.emitSetList(a, n, c);
			}
            continue;
        }

        //key:value类型
        let b = fi.allocReg();
        cgExp(fi, keyExp, b, 1);

        let c = fi.allocReg();
        cgExp(fi, valExp, c, 1);

        fi.freeRegs(2);

        fi.emitSetTable(a, b, c);
    }
}

//解析表达式
function cgExp(fi, exp, a, n)
{
    switch (exp.type) {
        case "IntegerExp":
            fi.emitLoadK(a, exp.val);
            break;

        case "FloatExp":
            fi.emitLoadK(a, exp.val);
            break;

        case "TrueExp":
            fi.emitLoadBool(a, 1, 0);
            break;

        case "BinopExp":
            cgBinopExp(fi, exp, a);
            break;

        case "NameExp":
            cgNameExp(fi, exp, a);
            break;

        case "FuncCallExp":
            cgFuncCallExp(fi, exp, a, n);
            break;

        case "StringExp":
            fi.emitLoadK(a, exp.str);
        break;

        case "TableAccessExp":
            cgTableAccessExp(fi, exp, a);
        break;

        case "FuncDefExp":
		    cgFuncDefExp(fi, exp, a);
            break;

        case "TableConstructorExp":
            cgTableConstructorExp(fi, exp, a);
            break;

        default:
            break;
    }
}

function cgIfStat(fi, node)
{
    let pcJmpToEnd = new Array(node.exps.length);//跳转到if语句结束处
    let pcJmpToNextExp = -1;

    for (let i = 0; i < node.exps.length; i++)
    {
        let exp = node.exps[i];

        if (pcJmpToNextExp >= 0)
        {
            //console.log("fixSbx", pcJmpToNextExp ,fi.pc() - pcJmpToNextExp);
            fi.fixSbx(pcJmpToNextExp, fi.pc() - pcJmpToNextExp);
        }

        let r = fi.allocReg();//分配lua寄存器

        cgExp(fi, exp, r, 1);//生成表达式相关语句

        fi.freeReg()//回收寄存器

        fi.emitTest(r, 0);//生成测试语句，测试表达式是否为真

        pcJmpToNextExp = fi.emitJmp(0, 0);//生成jmp语句

        fi.enterScope(false);
        cgBlock(fi, node.blocks[i]);
        fi.exitScope();

        if (i < node.exps.length - 1)
        {
            pcJmpToEnd[i] = fi.emitJmp(0, 0)//执行完block语句后跳转到if语句结束处
        }
        else
        {
            pcJmpToEnd[i] = pcJmpToNextExp;
        }
    }

    for (let i = 0; i < pcJmpToEnd.length; i++)
    {
        let pc = pcJmpToEnd[i];

        fi.fixSbx(pc, fi.pc() - pc);
    }
}

//生成函数调用指令
function cgFuncCallStat(fi, node)
{
    let r = fi.allocReg();
    cgFuncCallExp(fi, node, r, 0);//0代表无返回值
    fi.freeReg();
}

//赋值语句
function cgAssignStat(fi, node)
{
    //只支持单个函数表达式和单个变量
    let var_ =  node.varList[0];
    let func = node.expList[0];

    let a = fi.allocReg();
    cgExp(fi, func, a, 1);//处理FuncDefExp类型，生成closure语句||
    //fi.freeReg();         //处理数字类型，生成loadk指令


    if (var_.type == "TableAccessExp")
    {
        //如果是表访问表达式
        let t = fi.allocReg();
        cgExp(fi, var_.prefixExp, t, 1);//得到表变量

        let k = fi.allocReg();
        cgExp(fi, var_.keyExp, k, 1);//得到键

        //设置表t的k键值为func的值
        fi.emitSetTable(t, k, a);

        fi.freeReg();
        fi.freeReg();
        fi.freeReg();
        return;
    }

    ///////////////////////////////////////////////////////
    //常规全局变量
    // //手动调用，否则无法绑定全局表
    fi.freeReg(); 
    let upvalueIdx = fi.indexOfUpval("_ENV");

    //生成settapup语句
    //查找var_在常量表的索引
    let index = fi.indexOfConstant(var_.name);
    index |= 0x100;//转换为常量表索引

    fi.emitSetTabUp(upvalueIdx, index, a);
    ///////////////////////////////////////////////////////
}

function cgLocalVarDeclStat(fi, node)
{
    //暂时只支持一个变量，一个表达式的情况
    let exp = node.expList[0];
    let name = node.nameList[0];

    if (exp != undefined)
    {
        let a = fi.allocReg();

        cgExp(fi, exp, a, 1);//生成loadK指令载入数字2

        fi.freeReg();
    }
    else
    {
        //生成一条loadNil指令
        let a = fi.allocReg();
        fi.emitLoadNil(a, 1);
        fi.freeReg();
    }
    
    fi.addLocVar(name);//添加局部变量到局部变量表
}

function cgStat(fi, stat)
{
    switch (stat.type) {
        case "IfStat":
            cgIfStat(fi, stat);
            break;

        case "AssignStat":
		    cgAssignStat(fi, stat);
            break;

        case "FuncCallExp":
            cgFuncCallStat(fi, stat);
            break;

        case "LocalValDeclStat":
            cgLocalVarDeclStat(fi, stat);
            break;

        default:
            throw "cgStat error";
            break;
    }
}

function cgBlock(fi, blockNode)
{
    for (let i = 0; i < blockNode.stats.length; i++)
    {
        let stat = blockNode.stats[i];
        cgStat(fi, stat);
    }

    if (blockNode.retExps != null)
    {
        cgRetStat(fi, blockNode.retExps);//解析return语句
    }
}
///////////////////////////////////////////////////////////////////////////

function luaMain()
{
    let file = lua.readfile("luac.out");

    file.then(fileData =>{
        // if (fileData != "")
        // {
        //     let proto = unDump(fileData);
    
        //     list(proto);
        // }

        ls = newLuaState();//创建state
        fileData_ = fileData;
        //ls.register("print", print);//注册print函数

        // let a = 1;
        // let b = 0;

        // ls.pushInteger(a);//入栈一个整数
        // ls.setGlobal("a");  //将栈顶的数据出栈到lua全局变量区，并且赋给一个变量名"a"

        // ls.pushInteger(b);//入栈一个整数
        // ls.setGlobal("b");  //将栈顶的数据出栈到lua全局变量区，并且赋给一个变量名"b"

        ////////////////////////////////////////////////////////////
        ls.register("setValue", setValue);//注册setValue函数

        let button = '{"type":"button","name":"buttonAlarm","device_id":[1],"variable":[4],"value":[0],"x":120,"y":0}';

        let buttonAlarm = jsonParse(button);

        //console.log(buttonAlarm);

        ls.pushInteger(buttonAlarm);//入栈一个整数
        ls.setGlobal("buttonAlarm");
        
    });
    
}

//luaMain();

function parse(lexer)
{
    let ast = parseBlock(lexer);

    console.log("ast", ast);

    let fd = funcDefExp(0, 0, [], false, ast);//手工定义main函数
    let fi = newFuncInfo(null, fd);//定义最外层fi

    fi.addLocVar("_ENV");//添加_ENV变量

    cgFuncDefExp(fi, fd, 0);//手工调用生成函数虚拟机指令

    for (let i = 0; i < fi.subFuncs[0].insts.length; i++)
    {
        let code = fi.subFuncs[0].insts[i];
        let ii = inst(code)
        
        printOperands(ii);
    }
    
    return fi.subFuncs[0].toProto();//main函数被解析为fi的唯一子函数，直接调用main函数
}

function lexerTokens()
{
    let file = lua.readfile("alarmOrNot-onlyif.lua");

    function ab2str(buf) {
        return String.fromCharCode.apply(null, new Uint16Array(buf));
    }

    file.then(fileData =>{
        let str = ab2str(fileData);

        let lexer = newLexer(str, "alarmOrNot-onlyif.lua");

        
        proto_ = parse(lexer);

        ls = newLuaState();//创建state
        //fileData_ = fileData;

        ls.register("setValue", setValue);//注册setValue函数
        ls.register("print", print);//注册print函数

        let button = '{"type":"button","name":"buttonAlarm","device_id":[1],"variable":[4],"value":[0],"x":120,"y":0}';

        let buttonAlarm = jsonParse(button);

        //console.log(buttonAlarm);

        ls.pushInteger(buttonAlarm);//入栈一个整数
        ls.setGlobal("buttonAlarm");
    })
}

lexerTokens();