function F(x)
    return {get = function() return x end,
            set = function(y) x = y end}
end

o1 = F(10)
print(o1.get())
o1.set(20)
print(o1.get())
