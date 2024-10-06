<?php
/*********************************************************************************
	11/26/2010
	Delete most recent record added to TRANSACTIONS table.

	Edits:	02/09/2017  Replace depreciated mysql library with mysqli library.
						PHP 5.6 does not support mysql			
*********************************************************************************/

//Include DB login config and header files
include_once('../DatabaseConfig/db_config.php');
include_once('../Header_Footer/header.html');
include_once('../Functions/functions.php'); //  Includes custom mysqli_result() function


//Subquery to select last record added to DB
$sql_maxid = "SELECT max(id_transactions) as maxid
			  FROM transactions";
//Store query result in array			  
$result_maxid = mysqli_query($db_con, $sql_maxid);    
//Fetch Array values
$row = mysqli_fetch_assoc($result_maxid); 

//Query to DELETE last record added to DB
$sql_delete = "DELETE FROM transactions
			   WHERE id_transactions = $row[maxid]";		

//Execute Delete statement			   
$result_delete = mysqli_query($db_con, $sql_delete) or die(print'<h3>Transaction not deleted</h3>'.mysqli_error($db_con));


mysqli_close($db_con);
?>

<h3>Last Transaction Deleted</h3>
<a href="transactions.php">Add another transaction...</a> <br /><br />


<?php
include_once('../Header_Footer/footer.html');
?>