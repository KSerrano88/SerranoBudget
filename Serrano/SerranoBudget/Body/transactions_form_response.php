<?php

/*********************************************************************************
	11/26/2010
	Inserts a new record into TRANSACTIONS table

	Edits:	02/09/2017  Replace depreciated mysql library with mysqli library.
						PHP 5.6 does not support mysql			
*********************************************************************************/

//Include DB login config and header files
include_once('../DatabaseConfig/db_config.php');
include_once('../Header_Footer/header.html');
include_once('../Functions/functions.php'); //  Includes custom mysqli_result() function


if (isset($_POST['submit_button'])) {

//Date returned by calendar
$theDate = isset($_POST["date1"]) ? $_POST["date1"] : "";


//Tran type returned by transaction display form
$tranTypeSelect = isset($_POST["tran_type_select"]) ? $_POST["tran_type_select"] : "";
$tranTypeNew = isset($_POST["tran_type_new"]) ? $_POST["tran_type_new"] : "";

//Determine which tran type variable to use
if ($tranTypeSelect != "0" and $tranTypeNew == "") {
	$tranType = $tranTypeSelect;
	
} else if ($tranTypeSelect == "0" and $tranTypeNew != "") {
	$tranType = $tranTypeNew;
	
} else if ($tranTypeSelect != "0" and $tranTypeNew != "") {
	$tranType = $tranTypeNew;	
	
} else {
	$tranType = "";

}


$check_nmbr 	= 	$_POST['check_nmbr'];
$description 	= 	mysqli_real_escape_string($db_con, $_POST['description']);
$notes 			=	mysqli_real_escape_string($db_con, $_POST['notes']);
$multi_tran		=	$_POST['multi_tran'];
$posted_flag	=	$_POST['posted_flag'];
$debit			=	$_POST['debit'];
$credit			=	$_POST['credit'];	


//Insert Statement
$sql = "INSERT INTO transactions 
		VALUES ( NULL,
				'$theDate',
				'$check_nmbr', 
				'$description',
				'$notes',
				'$multi_tran',
				'$posted_flag',
				'$tranType',
				'$debit',
				'$credit')";
	
	/*********************************************************
	if($result = mysql_query($sql, $db_con)) {
			   //Query to display new record on screen
				$sql = "SELECT * 
						FROM transactions
						WHERE id_transactions
						IN (
						SELECT max( id_transactions ) 
						FROM transactions
						)";		
	**********************************************************/		
				//Store Select query in an array
				$result= mysqli_query($db_con, $sql);
				//$num=mysql_numrows($result);	
	/*********************************************************	
	} else {
		//Display error message on fail
		print '<h1>Insert Failed</h1>'.mysql_error();
	}
	**********************************************************/	
	
	echo '<meta http-equiv="Refresh" content="0;url=transactions_balance_sheet.php" />';
				
}  else {
	//If submit did not process direct back to process page.
	include_once('transactions.php');
}
				
//Close connection				
mysqli_close($db_con);				
				
?>

				<!-- HTML Table to display new record on screen after successful insertion -->
<!----------------------- Removing display.  Will redirect back to balance sheet instead --------------------------		   
			   <div class="table_display">
			   <h3>Thank you,</h3> 
			   <p>your transaction has been added to the database.</p>
			   <a href="transactions.php">Add another transaction...</a>
			   <a href="transactions_delete.php">Delete Last Transaction</a>
			   </div>
			   
				<table class="table_display">
				<thead>
				<tr>
				<th>Transaction_Date</th>
				<th>Check_Nmbr</th>
				<th>Description</th>
				<th>Notes</th>
				<th>Multi_Part_Tran_Total</th>
				<th>Posted_Flag</th>
				<th>Tran_Type</th>
				<th>Debit</th>
				<th>Credit</th>
				</tr>
				</thead>
			
<?php /*	
				//Loop places array values into table
				$i=0;
				
				while ($i<$num) {
					$tran_date = mysql_result($result,$i,"Transaction_Date");
					$check_nmbr = mysql_result($result,$i,"Check_Nmbr");
					$description = mysql_result($result,$i,"Description");
					$notes = mysql_result($result,$i,"Notes");
					$multi_tran = mysql_result($result,$i,"Multi_Part_Tran_Total");
					$posted_flag = mysql_result($result,$i,"Posted_Flag");
					$tran_type = mysql_result($result,$i,"Tran_Type");
					$debit = mysql_result($result,$i,"Debit");
					$credit = mysql_result($result,$i,"Credit");
?>					
					<tbody>
					<tr>
						<td><?php echo $tran_date; ?></td>
						<td><?php echo $check_nmbr; ?></td>
						<td><?php echo $description; ?></td>
						<td><?php echo $notes; ?></td>
						<td><?php echo $multi_tran; ?></td>
						<td><?php echo $posted_flag; ?></td>
						<td><?php echo $tran_type; ?></td>
						<td><?php echo $debit; ?></td>
						<td><?php echo $credit; ?></td>
					</tr>	
					</tbody>
<?php					
					$i++;
				}
?>				
				</table>
------------------------------------------------------------------------------------------------------------------>	 */				
?>

<?php
include_once('../Header_Footer/footer.html');
?>				