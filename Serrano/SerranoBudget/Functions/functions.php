<?php

// This function replicates mysql_result.  There is no direct equivilant in the mysqli libary.  This code was sourced from here http://stackoverflow.com/questions/2089590/mysqli-equivalent-of-mysql-result
function mysqli_result($res,$row=0,$col=0){ 
    $numrows = mysqli_num_rows($res); 
    if ($numrows && $row <= ($numrows-1) && $row >=0){
        mysqli_data_seek($res,$row);
        $resrow = (is_numeric($col)) ? mysqli_fetch_row($res) : mysqli_fetch_assoc($res);
        if (isset($resrow[$col])){
            return $resrow[$col];
        }
    }
    return false;
}


?>