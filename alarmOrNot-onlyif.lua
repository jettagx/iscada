a = 3
function alarmOrNot()
    if(labelA + labelB + labelC == a)
    then
        setValue(buttonAlarm, 1)
    else
        setValue(buttonAlarm, 0)
    end  
end

alarmOrNot()
