function f()
    return 1 
end

function g()
    return 1,2 
end

function k()
    return 1,2 
end


a, b, c, d = f(),g(),k()
print(a)
print(b)
print(c)
print(d)
