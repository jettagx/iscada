local a = 3
function alarmOrNot(a)
    if(labelA + labelB + labelC == a)
    then
        setValue(buttonAlarm, 1)
    else
        setValue(buttonAlarm, 0)
    end
    return a + 1  
end

b = alarmOrNot(a)
print(b)
