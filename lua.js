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

opCodes[0x6]  = getOpInfo(0, 1, OpArgU, OpArgK, IABC, "GETTABUP", _getTabUp);
opCodes[0x1]  = getOpInfo(0, 1, OpArgK, OpArgN, IABx, "LOADK", _loadK);
opCodes[0x24] = getOpInfo(0, 1, OpArgU, OpArgU, IABC, "CALL", _call);
opCodes[0x26] = getOpInfo(0, 0, OpArgU, OpArgN, IABC, "RETURN", _return);
opCodes[0xd] =  getOpInfo(0, 1, OpArgK, OpArgK, IABC, "ADD", _add);
opCodes[0x22] =  getOpInfo(1, 0, OpArgN, OpArgU, IABC, "TEST", _test);
opCodes[0x1e] =  getOpInfo(0, 0, OpArgR, OpArgN, IAsBx, "JMP", _jmp);
opCodes[0x2c] =  getOpInfo(0, 1, OpArgU, OpArgN, IABx, "CLOSURE", _closure);
opCodes[0x08] =  getOpInfo(0, 0, OpArgK, OpArgK, IABC, "SETTABUP", _settabup);
opCodes[0x1f] =  getOpInfo(1, 0, OpArgK, OpArgK, IABC, "EQ", _eq);


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
    console.log("_getTabUp");
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
    ls.call(nArgs, c-1);
    _popResults(a, c, ls);
}

function _return(inst, ls)
{
    console.log("_return");
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
    console.log("_closure");
    let i = inst.abx();

    let a = i.a + 1;
    let bx = i.bx;

    ls.loadProto(bx);
    ls.replace(a);
}

function _settabup(inst, ls)
{
    console.log("_settabup");
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
    console.log("_eq");
    _compare(inst, ls, LUA_OPEQ);
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

    const MAXARG_Bx = (1<<18) - 1       // 262143
    const MAXARG_sBx = MAXARG_Bx >> 1 // 131071

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
        console.log("stack push value:", val);
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

        console.log("stack pop value :", val);

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

//创建表格对象,暂时只考虑map情况
function newLuaTable(nArr, nRec)
{
    let i = {};

    i._map = new Map();

    i.put = function (key, val)
    {
        //将值写入map
        i._map.set(key, val);
    };

    i.get = function(key)
    {
        return i._map.get(key);
    };

    return i;
}

function newLuaClosure(proto)
{
    let c = {};
    c.proto = proto;

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

        //console.log("ls.stack.push(closure);",closure)
        ls.stack.push(closure);

        //支持upvalue，暂不支持引用函数外变量
        for (let i = 0; i < subProto.Upvalues.length; i++)
        {
            let uvIdx = subProto.Upvalues[i].Idx;

            if (subProto.Upvalues[i].Instack == 1)
            {
                throw "loadProto unsupport";
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
        let proto = unDump(fileData);

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

        console.log("set global :", name, v);
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
        let nParams = c.proto.NumParams;

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

    ls.arith = function(op)
    {
        //只处理加法指令
        let a,b;
        b = ls.stack.pop();
        a = ls.stack.pop();

        ls.stack.push(a+b);
    };

    ls.pushLuaStack(newLuaStack(LUA_MINSTACK, ls));

    return ls;
}


//////////////////////////////////////////////////

function print(ls)
{
    //得到传来的参数
    console.log(ls.stack.pop());
    
    return 0;
}

function setValue(ls)
{
    console.log("setValue()");
    //console.log(ls.stack.pop());
    //console.log(ls.stack.pop());
    let val = ls.stack.pop();
    let label = ls.stack.pop();

    label.val = val;

    console.log("setValue() update:", label.val);
}

function luaMain()
{
    let file = lua.readfile("luac.out");

    file.then(fileData =>{
        // if (fileData != "")
        // {
        //     let proto = unDump(fileData);
    
        //     list(proto);
        // }

        let ls = newLuaState();//创建state
        //ls.register("print", print);//注册print函数

        // let a = 1;
        // let b = 0;

        // ls.pushInteger(a);//入栈一个整数
        // ls.setGlobal("a");  //将栈顶的数据出栈到lua全局变量区，并且赋给一个变量名"a"

        // ls.pushInteger(b);//入栈一个整数
        // ls.setGlobal("b");  //将栈顶的数据出栈到lua全局变量区，并且赋给一个变量名"b"

        ls.register("setValue", setValue);//注册print函数

        let labelA = 1;
        let labelB = 1;
        let labelC = 1;

        let labelShow = {val:"",type:"label"};

        ls.pushInteger(labelA);//入栈一个整数
        ls.setGlobal("labelA");  //将栈顶的数据出栈到lua全局变量区，并且赋给一个变量名"labelA"

        ls.pushInteger(labelB);//入栈一个整数
        ls.setGlobal("labelB");  //将栈顶的数据出栈到lua全局变量区，并且赋给一个变量名"labelB"

        ls.pushInteger(labelC);//入栈一个整数
        ls.setGlobal("labelC");  //将栈顶的数据出栈到lua全局变量区，并且赋给一个变量名"labelC"

        ls.pushInteger(labelShow);//入栈一个标签
        ls.setGlobal("labelShow");  //将栈顶的数据出栈到lua全局变量区，并且赋给一个变量名"labelC"

        ls.load(fileData, "any", "bt");

        ls.call(0, 0);
    });
    
}

luaMain();