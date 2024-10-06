<?php
/*********************************************************************************
	12/23/2010
	Produces form used to edit selected transactions
	
	Edits:	02/09/2017  Replace depreciated mysql library with mysqli library.
						PHP 5.6 does not support mysql	
*********************************************************************************/
//Include DB login config and header files
include_once('../DatabaseConfig/db_config.php');
include_once('../Header_Footer/header.html');
include_once('../Functions/functions.php'); //  Includes custom mysqli_result() function

// Get update method
$deleteSelected = isset($_POST["delete_selected"]) ? $_POST["delete_selected"] : "";
$editSelected = isset($_POST["edit_selected"]) ? $_POST["edit_selected"] : "";

// Get selected transactions from balance sheet as array
$ids = isset($_POST["edit"]) ? $_POST["edit"] : "";
$id = isset($_POST["edit"]) ? implode(',',$ids) : "";


// If method is edit select rows to update.  If method is delete, delete rows and refresh balance sheet.
if($editSelected) {
	// Select transactions by ID
	$sql = "SELECT *
			FROM transactions
			WHERE ID_TRANSACTIONS IN ( $id )";
			
	$result = mysqli_query($db_con, $sql);
	$num = isset($_POST["edit"]) ? mysqli_num_rows($result) : "";
		
} 
else {
	$sql = "DELETE
			FROM transactions
			WHERE ID_TRANSACTIONS IN ( $id )";

	$result = mysqli_query($db_con, $sql);

	if($result) {
	
	// After delete, redirect back to balance sheet.
	echo '<meta http-equiv="Refresh" content="0;url=transactions_balance_sheet.php" />';
	exit;
}
		
}		
?>	
	<form method="post"  class="form_element" action="update_transactions_form_response.php" name="update_transaction">

	<!-- HTML Table to display transaction history results -->
	<table class="table_display">
	<thead>
	<tr>
		<th></th>				
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
		$tran_id = mysqli_result($result,$i,"ID_TRANSACTIONS");
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
			<td><input type="hidden" name="tran_id[]" value="<?php echo $tran_id; ?>" /></td>
			<td><input type="text" name="tran_date[]" value="<?php echo $tran_date; ?>" /></td>
			<td><input type="text" name="check_nmbr[]" value="<?php echo $check_nmbr; ?>" /></td>
			<td><input type="text" name="description[]" value="<?php echo $description; ?>" /></td>
			<td><input type="text" name="notes[]" value="<?php echo $notes; ?>" /></td>
			<td><input type="text" name="multi_tran[]" value="<?php echo $multi_tran; ?>" /></td>
			<td><input type="text" name="posted_flag[]" value="<?php echo $posted_flag; ?>" /></td>
			<td><input type="text" name="tran_type[]" value="<?php echo $tran_type; ?>" /></td>
			<td><input type="text" name="debit[]" value="<?php echo $debit; ?>" /></td>
			<td><input type="text" name="credit[]" value="<?php echo $credit; ?>" /></td>
		</tr>	
		</tbody>
<?php					
		$i++;
	}				
?>				
	</table>
	
	<input type="submit" class="button" name="update_selected" value="Update Selected" />	
	</form>
<?php
include_once('../Header_Footer/footer.html');
?>