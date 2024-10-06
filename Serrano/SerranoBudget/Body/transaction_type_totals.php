<?php

/*********************************************************************************
	02/01/2011
	Display transaction totals for each month in selected year
	
	Edits:	02/09/2017  Replace depreciated mysql library with mysqli library.
						PHP 5.6 does not support mysql	
*********************************************************************************/

//Include DB login config and header files
include_once('../DatabaseConfig/db_config.php');
include_once('../Header_Footer/header.html');
include_once('../Functions/functions.php'); //  Includes custom mysqli_result() function


$curYear = date("Y");
$curMonth = date("n");
$priorYear = $curYear - 1;

// Loop through the months of the current year starting with current month and create a table for each one.
WHILE ($curMonth > 0 and $curYear >= $priorYear) {

	//Get current month name
	$dateArray = getdate(mktime(0,0,0,$curMonth,1,$curYear));
	$curMonthName = "$dateArray[month]";


	/* SQL Queries */
				
	//Get sum of DEBITS for Date Range
	$sqlDebitSum = "SELECT 	MONTHNAME(TRANSACTION_DATE) as DEBIT_MONTH, 
							YEAR(TRANSACTION_DATE) as DEBIT_YEAR,
							COALESCE(TRAN_TYPE,'TOTAL DEBITS')as DEBIT_TRAN_TYPE, 
							SUM(DEBIT) AS SUM_DEBIT
					FROM transactions 
					WHERE MONTH(TRANSACTION_DATE) = '$curMonth'
					AND   YEAR(TRANSACTION_DATE) = '$curYear'
					AND   DEBIT <> '0'
					GROUP BY TRAN_TYPE 
					WITH ROLLUP ";		

															 
	//If query is successful, then store results
	if($resultDebitSum = mysqli_query($db_con,$sqlDebitSum)) {
		
				//Store Select query results in an array
				$resultDebitSum = mysqli_query($db_con,$sqlDebitSum);
				$numDebit=mysqli_num_rows($resultDebitSum);
				
	} else {
		//Display error message on fail
		print '<h1>Request Failed</h1>'.mysqli_error($db_con);
	}
					 



	//Get sum of CREDITS for Date Range
	$sqlCreditSum = "SELECT MONTHNAME(TRANSACTION_DATE) as CREDIT_MONTH, 
							YEAR(TRANSACTION_DATE) as CREDIT_YEAR,
							COALESCE(TRAN_TYPE,'TOTAL CREDITS')as CREDIT_TRAN_TYPE, 
							SUM(CREDIT) AS SUM_CREDIT
					FROM transactions 
					WHERE MONTH(TRANSACTION_DATE) = '$curMonth'
					AND   YEAR(TRANSACTION_DATE) = '$curYear'
					AND   CREDIT <> '0'
					GROUP BY TRAN_TYPE 
					WITH ROLLUP ";									 

	//If query is successful, then store results
	if($resultCreditSum = mysqli_query($db_con, $sqlCreditSum)) {
		
				//Store Select query results in an array
				$resultCreditSum = mysqli_query($db_con, $sqlCreditSum);
				$numCredit=mysqli_num_rows($resultCreditSum);
				
	} else {
		//Display error message on fail
		print '<h1>Request Failed</h1>'.mysqli_error($db_con);
	}									

	?>


	<!-- HTML Table to display Total Debits -->
	<table class="table_display_group">
	<caption><?php echo $curMonthName.' '.$curYear; ?></caption>
	<thead>
	<tr>
		<th>Transaction Type Debit</th>				
		<th>Debits</th>	
		<th>Transaction Type Credit</th>
		<th>Credits</th>
	</tr>
	</thead>



	<?php
	//Loop places query array values into table.  Loop continues while there are either debit or credit records to draw from.
	$i=0;
	$j=0;
	WHILE ($i<$numDebit or $j<$numCredit) {
		IF ($i<$numDebit) {
			$trantype_debit = mysqli_result($resultDebitSum,$i,"DEBIT_TRAN_TYPE");
			$sum_debit = mysqli_result($resultDebitSum,$i,"SUM_DEBIT");
		} ELSE {
			$trantype_debit = NULL;
			$sum_debit = NULL;
		}
		
		IF ($j<$numCredit) {
			$trantype_credit = mysqli_result($resultCreditSum,$j,"CREDIT_TRAN_TYPE");
			$sum_credit = mysqli_result($resultCreditSum,$j,"SUM_CREDIT");
		} ELSE {
			$trantype_credit = NULL;
			$sum_credit = NULL;
		}
	?>
					
		<tbody>
		<tr>
			<td><?php echo $trantype_debit; ?></td>
			<td  style="text-align:right;"><?php echo $sum_debit; ?></td>
			<td><?php echo $trantype_credit; ?></td>
			<td  style="text-align:right;"><?php echo $sum_credit; ?></td>
		</tr>
		
	<?php					
	$i++;
	$j++;
	}				
	?>			
	</tbody>
	</table>

<?php
$curMonth --;
if ($curMonth == 0){
	$curMonth = 12;
	$curYear--;
}

}

//Close connection				
mysqli_close($db_con);
?>			

<?php
include_once('../Header_Footer/footer.html');
?>				