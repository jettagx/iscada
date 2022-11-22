//转换key
function Obj2jsonKey(key)
{
  return '"' + key + '"';
}

//转换value
function Obj2jsonValue(value)
{
  if (value instanceof Array)
  {
      return Obj2jsonArray(value);
  }
  else if (typeof(value)=='string')
  {
      return Obj2jsonKey(value);
  }
  else if (typeof(value)=='number')
  {
      return value;
  }

  throw "Obj2jsonValue error";
}

//转换数组
function Obj2jsonArray(array)
{
  let result = '[';

  //遍历数组
  for (let key in array)
  {
    if (typeof(array[key])=='number')
    {
      result += array[key];
    }
    else if(array[key] instanceof Object)
    {
      //return result;
      result += Obj2json(array[key]);
    }
    else
    {
      throw "Obj2jsonArray error";
    }

    
    let len = array.length;

    if (len != 1 && len - 1 != key)
    {
      result += ",";//数组中多个元素之间加逗号分隔
    }
  }
  

  return result + "]";
}


module.exports.Obj2json = function Obj2json(Obj)
{
  let result = '{\n';

  for (let key in Obj)
  {
      result += Obj2jsonKey(key);
      result += ":";
      result += Obj2jsonValue(Obj[key]);
      
      let arr = Object.keys(Obj);
      let len = arr.length;

      if (len != 1 && arr[len - 1] != key)
      {
        result += ",";
      }

      result += '\n';
  }

  return result + "}";
}