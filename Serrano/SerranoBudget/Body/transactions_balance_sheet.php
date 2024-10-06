<?php
/*********************************************************************************
	12/17/2010
	Displays balance sheet
	
	Edits:	02/09/2017  Replace depreciated mysql library with mysqli library.
						PHP 5.6 does not support mysql
*********************************************************************************/
//Include DB login config and header files
include_once('../DatabaseConfig/db_config.php');
include_once('../Header_Footer/header.html');
include_once('../Functions/functions.php'); //  Includes custom mysqli_result() function



//Variable to determine whether to display all transactions within date range, or unposted transactions only
$postStat = isset($_POST["postStatus"]) ? $_POST[("postStatus")] : "(0,1)";


//Variable to identify how many days of transaction history to display
$numDaysPrior = isset($_POST["numDaysPrior"]) ? $_POST["numDaysPrior"] : "30";
$tranDate = date('Y-m-d',strtotime($numDaysPrior.' days ago'));
$curDate = date('Y-m-d');


/* SQL Queries */
//Get Transaction Details.  If looking at posted transactions use $tranDate, If unposted eliminate $tranDate.
if ($postStat != "(0)") {
$sqlTran = "SELECT * 
			FROM transactions 
			WHERE 1=1
			AND   TRANSACTION_DATE >= '$tranDate'
			AND	  POSTED_FLAG IN $postStat
			ORDER BY TRANSACTION_DATE DESC, ID_TRANSACTIONS DESC";
} else {
$sqlTran = "SELECT * 
			FROM transactions 
			WHERE 1=1
			AND	  POSTED_FLAG IN $postStat
			ORDER BY TRANSACTION_DATE DESC, ID_TRANSACTIONS DESC";
}			
			
//Get SUM of Debits and Credits for Date Range. If looking at posted transactions use $tranDate, If unposted eliminate $tranDate.
if ($postStat != "(0)") {
$sqlSum = "SELECT 	ROUND(SUM(DEBIT),2) AS SUM_DEBIT, 
					ROUND(SUM(CREDIT),2) AS SUM_CREDIT,
					(ROUND(SUM(CREDIT),2) - ROUND(SUM(DEBIT),2)) AS DIFFERENCE								
			FROM transactions
			WHERE 1=1
			AND	  POSTED_FLAG IN $postStat
			AND   TRANSACTION_DATE >= '$tranDate'";		
} else {
$sqlSum = "SELECT 	ROUND(SUM(DEBIT),2) AS SUM_DEBIT, 
					ROUND(SUM(CREDIT),2) AS SUM_CREDIT,
					(ROUND(SUM(CREDIT),2) - ROUND(SUM(DEBIT),2)) AS DIFFERENCE								
			FROM transactions
			WHERE 1=1
			AND	  POSTED_FLAG IN $postStat";	
}			

//Get Total SUM of Debits and Credits
$sqlSumTotal = "SELECT 	ROUND(SUM(DEBIT),2) AS SUM_DEBIT, 
						ROUND(SUM(CREDIT),2) AS SUM_CREDIT,
						(ROUND(SUM(CREDIT),2) - ROUND(SUM(DEBIT),2)) AS DIFFERENCE,
						((ROUND(SUM(CREDIT),2) - ROUND(SUM(DEBIT),2)) + (Select AMOUNT From balance_carryover)) AS TOTAL_BAL
				FROM transactions";					
			
// Get Posted SUM of Debits and Credits			
$sqlSumPosted=	"SELECT ROUND(SUM(DEBIT),2) AS POSTED_DEBIT, 
						ROUND(SUM(CREDIT),2) AS POSTED_CREDIT,
						((ROUND(SUM(CREDIT),2) - ROUND(SUM(DEBIT),2)) + (Select AMOUNT From balance_carryover)) AS TOTAL_POSTED_BAL
				 FROM `transactions`
				 WHERE POSTED_FLAG = 1";

//Get Carry Over amount
$sqlCarryOver = "SELECT ROUND(SUM(AMOUNT),2) AS CARRYOVER_AMOUNT
				 FROM balance_carryover
				 WHERE IS_ACTIVE = 1";
				 
			 				 							 
//If query is successful, then store results
if($resultTran = mysqli_query($db_con,$sqlTran)) {
	//Page header with date range
	print '<div class="table_display">
		   <h3>'.$numDaysPrior.' Day Balance Sheet</h3>
		   <p><strong>'.date('m/d/Y',strtotime($tranDate)).' - '.date('m/d/Y',strtotime($curDate)).'</strong></p>
		   </div>';	
	
			//Store Select query results in an array
			$resultTran= mysqli_query($db_con,$sqlTran);
			$resultSum = mysqli_query($db_con,$sqlSum);
			$resultSumTotal = mysqli_query($db_con,$sqlSumTotal);
			$resultSumPosted = mysqli_query($db_con,$sqlSumPosted);
			$resultCarryOver = mysqli_query($db_con,$sqlCarryOver);
			$num=mysqli_num_rows($resultTran);
			
} else {
	//Display error message on fail
	print '<h1>Request Failed</h1>'.mysqli_error($db_con);
}
				 
				 
				
//Close connection				
mysqli_close($db_con);				
?>
<!-- Change results date range -->
<form class="form_element" action="transactions_balance_sheet.php" method="post" name="numDaysForm" id="numDaysPrior">
	<label for="numDaysPrior">Number of Prior Days to Display:</label> 
	<input type="text" size="5" name="numDaysPrior" id="numDaysPrior" />
	<input type="submit" value="Refresh" />
</form>	

<!-- HTML Table to display Total Credits and Debits -->
<table class="table_display">
<thead>
<tr>
	<th>Total_Debits</th>				
	<th>Total_Credits</th>				
	<th>Difference</th>	
	<th>Current Posted Balance</th>	
	<th>Current Total Balance</th>	
</tr>
</thead>

<?php
$sum_debit = mysqli_result($resultSum,0,"SUM_DEBIT");
$sum_credit = mysqli_result($resultSum,0,"SUM_CREDIT");
$sum_diff = mysqli_result($resultSum,0,"DIFFERENCE");
$carryOver = mysqli_result($resultCarryOver,0,"CARRYOVER_AMOUNT");
$sumPostedDebit = mysqli_result($resultSumPosted,0,"POSTED_DEBIT");
$sumPostedCredit = mysqli_result($resultSumPosted,0,"POSTED_CREDIT");
$sumTotalDebit = mysqli_result($resultSumTotal,0,"SUM_DEBIT");
$sumTotalCredit = mysqli_result($resultSumTotal,0,"SUM_CREDIT");				
$totalPostedBal = mysqli_result($resultSumPosted,0,"TOTAL_POSTED_BAL");
$totalBal = mysqli_result($resultSumTotal,0,"TOTAL_BAL");
?>
				
<tbody>
<tr>
	<td><?php echo $sum_debit; ?></td>
	<td><?php echo $sum_credit; ?></td>
	<td><?php echo $sum_diff; ?></td>
	<td><?php echo $totalPostedBal; ?></td>
	<td><?php echo $totalBal; ?></td>
</tr>
</tbody>
</table>


<!-- HTML Table to display transaction history results -->
<table class="table_display">
<thead>
<tr>
	<th>Edit</th>
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


<div class="form_element">
<?php // If Unposted transactions are being shown, display SHOW ALL TRANSACTIONS button
if ($postStat != "(0)") {
?>
	<!-- Dislpay Unposted transactions -->
	<form method="post" action="transactions_balance_sheet.php" name="unposted_transactions" >
	<input type="hidden" value="(0)" name="postStatus" />
	<input type="submit" class="button" name="show_unposted" value="Show Unposted Transactions" />
	<!-- <button class="button" name="show_unposted"><span>Show Unposted Transactions</span></button> -->
	</form>
<?php
} else {
?>
	<!-- Dislpay All transactions -->
	<form method="post" action="transactions_balance_sheet.php" name="unposted_transactions" >
	<input type="hidden" value="(0,1)" name="postStatus" />
	<input type="submit" class="button" name="show_unposted" value="Show All Transactions" />
	</form>
<?php
}
?>


<!-- Edit Selected transactions -->
<form method="post" action="edit_transactions_form_response.php" name="edit_transaction">
<input type="submit" class="button" id="edit_selected" name="edit_selected" value="Edit Selected"/>

<!-- Delete Selected transactions --> 
<input type="submit" class="button" id="delete_selected" name="delete_selected" value="Delete Selected" onclick="return (confirm('do you REALLY want to delete these transactions?'));" />


<?php	
//Loop places array values into table
$i=0;

while ($i<$num) {
	$tran_id = mysqli_result($resultTran,$i,"ID_TRANSACTIONS");
	$tran_date = mysqli_result($resultTran,$i,"TRANSACTION_DATE");
	$check_nmbr = mysqli_result($resultTran,$i,"CHECK_NMBR");
	$description = mysqli_result($resultTran,$i,"DESCRIPTION");
	$notes = mysqli_result($resultTran,$i,"NOTES");
	$multi_tran = mysqli_result($resultTran,$i,"MULTI_PART_TRAN_TOTAL");
	$posted_flag = mysqli_result($resultTran,$i,"POSTED_FLAG");
	$tran_type = mysqli_result($resultTran,$i,"TRAN_TYPE");
	$debit = mysqli_result($resultTran,$i,"DEBIT");
	$credit = mysqli_result($resultTran,$i,"CREDIT");	
	
?>					
	<tbody>
	<tr>
		<td><input type="checkbox" name="edit[]" id="edit[]" value="<?php echo $tran_id; ?>" /></td>
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
</form>
</div>
</table>
			

<?php
include_once('../Header_Footer/footer.html');
?>				