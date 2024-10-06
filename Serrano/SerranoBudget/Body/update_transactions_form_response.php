<?php

/*********************************************************************************
	12/24/2010
	Sends updates to database

	Edits:	02/09/2017  Replace depreciated mysql library with mysqli library.
						PHP 5.6 does not support mysql		

			02/22/2017	Add mysqli_real_escape_string to description and notes.
*********************************************************************************/

//Include DB login config and header files
include_once('../DatabaseConfig/db_config.php');
include_once('../Header_Footer/header.html');
include_once('../Functions/functions.php'); //  Includes custom mysqli_result() function

$tran_id = isset($_POST["tran_id"]) ? $_POST["tran_id"] : "";
$tran_date = isset($_POST["tran_date"]) ? $_POST["tran_date"] : "";
$check_nmbr = isset($_POST["check_nmbr"]) ? $_POST["check_nmbr"] : "";
$description = isset($_POST["description"]) ? $_POST["description"] : "";
$notes = isset($_POST["notes"]) ? $_POST["notes"] : "";
$multi_tran = isset($_POST["multi_tran"]) ? $_POST["multi_tran"] : "";
$posted_flag = isset($_POST["posted_flag"]) ? $_POST["posted_flag"] : "";
$tran_type = isset($_POST["tran_type"]) ? $_POST["tran_type"] : "";
$debit = isset($_POST["debit"]) ? $_POST["debit"] : "";
$credit = isset($_POST["credit"]) ? $_POST["credit"] : "";


/* Update selected records */
$i=0;
foreach ($tran_id as $id1) {

	$escape_description = mysqli_real_escape_string($db_con, $description[$i]);
	$escape_notes = mysqli_real_escape_string($db_con, $notes[$i]);

	mysqli_query($db_con,
				 "UPDATE transactions
			     SET TRANSACTION_DATE = '$tran_date[$i]',
				 	 CHECK_NMBR = '$check_nmbr[$i]',
					 DESCRIPTION = '$escape_description',
					 NOTES = '$escape_notes',
					 MULTI_PART_TRAN_TOTAL = '$multi_tran[$i]', 
					 POSTED_FLAG = '$posted_flag[$i]',
					 TRAN_TYPE = '$tran_type[$i]',
					 DEBIT = '$debit[$i]',
					 CREDIT = '$credit[$i]'
			     WHERE ID_TRANSACTIONS = $tran_id[$i]")
			     or die(mysqli_error($db_con));					
	$i++;
}				 

?>
<div class="table_display">
<h3>Update successful</h3>
</div>
<!-- Display updated records -->
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
$j=0;
foreach ($tran_id as $id2) {
	
	$result = mysqli_query($db_con,
						   "SELECT *
						   FROM transactions
						   WHERE ID_TRANSACTIONS = $tran_id[$j]")
						   or die(mysqli_error($db_con));
				 
	$tran_date = mysqli_result($result,0,"TRANSACTION_DATE");
	$check_nmbr = mysqli_result($result,0,"CHECK_NMBR");
	$description = mysqli_result($result,0,"DESCRIPTION");
	$notes = mysqli_result($result,0,"NOTES");
	$multi_tran = mysqli_result($result,0,"MULTI_PART_TRAN_TOTAL");
	$posted_flag = mysqli_result($result,0,"POSTED_FLAG");
	$tran_type = mysqli_result($result,0,"TRAN_TYPE");
	$debit = mysqli_result($result,0,"DEBIT");
	$credit = mysqli_result($result,0,"CREDIT");			

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

	$j++;

}

mysqli_close($db_con);

?>
	</table>
	
	
<?php
include_once('../Header_Footer/footer.html');
?>	
	
	