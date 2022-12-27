function add0(a, b)
    if b >= 10 then
        error("number is too large!")
    else
        return a + b
    end
end

function add1(a, b) return add0(a, b) end
function add2(a, b) return add1(a, b) end

ok, result = pcall(add2, 4, 10)
print(ok)
print(result)
