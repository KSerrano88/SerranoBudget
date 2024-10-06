<?php

/*********************************************************************************
	12/17/2010
	Displays transaction history

	Edits:	02/09/2017  Replace depreciated mysql library with mysqli library.
						PHP 5.6 does not support mysql		
*********************************************************************************/

//Include DB login config and header files
include_once('../DatabaseConfig/db_config.php');
include_once('../Header_Footer/header.html');
include_once('../Functions/functions.php'); //  Includes custom mysqli_result() function

//Date returned by calendar
$startDate = isset($_POST["date1"]) ? $_POST["date1"] : "";
$endDate = isset($_POST["date2"]) ? $_POST["date2"] : "";

//Tran type returned by transaction display form
$tranType = isset($_POST["tran_type"]) ? $_POST["tran_type"] : "";
$tranTypeContains = isset($_POST["tran_type_contains"]) ? $_POST["tran_type_contains"] : "";



//Dynamic where clause for Tran type.  Allows for optional tran type selection.
if ($tranType != "0" and $tranTypeContains == "") {
	$whereTranType = "AND TRAN_TYPE = '$tranType'";
	
} else if ($tranType == "0" and $tranTypeContains != "") {
	$whereTranType = "AND TRAN_TYPE LIKE '%$tranTypeContains%'";
	
} else if ($tranType != "0" and $tranTypeContains != "") {
	$whereTranType = "AND (TRAN_TYPE = '$tranType' AND TRAN_TYPE like '%$tranTypeContains%')";	
	
} else {
	$whereTranType = "";

}



if (isset($_POST['submit_button'])) {
	//Get Transaction Details
	$sql = "SELECT * 
			FROM transactions 
			WHERE 1=1
			AND   TRANSACTION_DATE >= '$startDate'
			AND   TRANSACTION_DATE <= '$endDate' "
			.$whereTranType.
			" ORDER BY TRANSACTION_DATE, ID_TRANSACTIONS";

	//Get SUM of Debits and Credits
	$sql_sum = "SELECT 	ROUND(SUM(DEBIT),2) AS SUM_DEBIT, 
						ROUND(SUM(CREDIT),2) AS SUM_CREDIT,
						(ROUND(SUM(CREDIT),2)  - ROUND(SUM(DEBIT),2)) AS DIFFERENCE
				FROM transactions 
				WHERE 1=1
				AND   TRANSACTION_DATE >= '$startDate'
				AND   TRANSACTION_DATE <= '$endDate' "
				.$whereTranType;

	//If query is successful, then store results
	if($result = mysqli_query($db_con, $sql)) {
		print '<h3>'.$startDate.' / '.$endDate.' </h3> Trans history below.';	
		
				//Store Select query results in an array
				$result= mysqli_query($db_con, $sql);
				$result_sum = mysqli_query($db_con, $sql_sum);
				$num=mysqli_num_rows($result);
				
	} else {
		//Display error message on fail
		print '<h1>Request Failed</h1>'.mysqli_error($db_con);
	}
	
				
}  else {
	//If submit did not process, direct back to process page.
	include_once('transactions_display.php');
}


				
//Close connection				
mysqli_close($db_con);				



?>
				<!-- HTML Table to display Total Credits and Debits -->
				<table class="table_display">	
				<thead>
				<tr>
					<th>Total_Debits</th>				
					<th>Total_Credits</th>				
					<th>Difference</th>	
				</tr>
				</thead>
<?php
				$sum_debit = mysqli_result($result_sum,0,"SUM_DEBIT");
				$sum_credit = mysqli_result($result_sum,0,"SUM_CREDIT");
				$sum_diff = mysqli_result($result_sum,0,"DIFFERENCE");
?>				
				<tbody>
				<tr>
					<td><?php echo $sum_debit; ?></td>
					<td><?php echo $sum_credit; ?></td>
					<td><?php echo $sum_diff; ?></td>
				</tr>
				</tbody>
				</table>

				
				<!-- HTML Table to display results -->
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
<?php	
				//Loop places array values into table
				$i=0;
				
				while ($i<$num) {									
					$tran_date = mysqli_result($result,$i,"TRANSACTION_DATE");
					$check_nmbr = mysqli_result($result,$i,"CHECK_NMBR");
					$description = mysqli_result($result,$i,"DESCRIPTION");
					$notes = mysqli_result($result,$i,"NOTES");
					$multi_tran = mysqli_result($result,$i,"MULTI_PART_TRAN_TOTAL");
					$posted_flag = mysqli_result($result,$i,"POSTED_FLAG");
					$tran_type = mysqli_result($result,$i,"TRAN_TYPE");
					$debit = mysqli_result($result,$i,"DEBIT");
					$credit = mysqli_result($result,$i,"CREDIT");						
								
?>					
					<tbody>
					<tr>
						<td><?php echo $tran_date; ?></td>
						<td><?php echo $check_nmbr; ?></td>
						<td><?php echo $description;?></td>
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


<?php
include_once('../Header_Footer/footer.html');
?>				