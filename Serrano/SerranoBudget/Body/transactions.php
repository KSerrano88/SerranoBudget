<!--------------------------------------------------------------------------------------
	11/26/2010
	Form to add a new transaction into TRANSACTIONS table.
	
	Edits:	02/09/2017  Replace depreciated mysql library with mysqli library.
						PHP 5.6 does not support mysql		
			03/12/2023  tc_calendar no longer works in PHP 8.  Remove class and replace with HTML date fields
--------------------------------------------------------------------------------------->

<?php
//Include DB login config and header files
include_once('../DatabaseConfig/db_config.php');
include_once('../Header_Footer/header.html');
include_once('../Functions/functions.php'); //  Includes custom mysqli_result() function
?>


<!-- Form for adding a new transaction -->
<form class="form_element" method="post" action="transactions_form_response.php" name="add_transaction">
<h3>Add a new transaction </h3>

	<?php //CALENDAR
	//get class into the page
	//require_once("../Calendar/classes/tc_calendar.php");
	
	$cur_day = date("d");
	$cur_month = date("m");
	$cur_year = date("Y");

	//instantiate class and set properties
	  //$myCalendar = new tc_calendar("date1", true);
	  //$myCalendar->setPath("../Calendar/calendar_form.php");
	  //$myCalendar->setIcon("../Calendar/images/iconCalendar.gif");
	  //$myCalendar->setDate($cur_day, $cur_month, $cur_year);
	//output the calendar
	  //$myCalendar->writeScript();	   
	?>

	<!-- use javascript to get the value from the calendar -->
	<!--<script language="javascript"> -->
	<!--
	//function showDateSelected(){
	//   alert("Date selected is "+document.add_transaction.date1.value);
	//}
	//-->
	<!--</script>-->
	<!-- create link to click and check calendar value  -->
	<!-- &nbsp <a href="javascript:showDateSelected();">Check calendar value</a>--> <br /> 
	
	<label for="posted_flag">Transaction Posted</label>  <input name="posted_flag" id="posted_flag" type="checkbox" value=1> <br />
	<label for="date1">Transaction Date:</label>  <input name="date1" id="date1" type="text" size="15" maxlength="10"> <br />
	<label for="check_nmbr">Check Number:</label>  <input name="check_nmbr" id="check_nmbr" type="text" size="15" maxlength="10"> <br />
	<label for="description">Description:</label>  <input name="description" id="description" type="text" size="50" maxlength="100"> <br />
	<label for="notes">Notes:</label>  <textarea name="notes" id="notes" type="text" size="50" rows="3" maxlength="200" ></textarea> <br />
	<label for="multi_tran">Multi-Part Transaction Total:</label>  <input name="multi_tran" id="mulit_tran" type="text" size="15" maxlength="10"> <br />	
	
	<!-- Create dynamic list of transaction type, or allow user to enter new transaction type -->
	<label for="tran_type_select">Transaction Type:</label>
		<!-- Create list of Transaction Types to select from -->
		<?php
		$sql = "SELECT DISTINCT TRAN_TYPE
				FROM transactions
				ORDER BY TRAN_TYPE";
		
		//Store Select query in an array
		$result= mysqli_query($db_con, $sql);
		$num=mysqli_num_rows($result);
		
		//Close connection				
		mysqli_close($db_con);					
		?>
	    <select name="tran_type_select" id="tran_type_select" class="select">
		<option name="default"  value="0" selected>-- Select Transaction Type --</option>
		<?php
		//Loop places array values into Select list
		$i=0;			
		while ($i<$num) {
		$tran_type_select = mysqli_result($result,$i,"TRAN_TYPE");
		?>
		<option name="$tran_type_select"><?php echo $tran_type_select; ?></option>
		
		<?php
		$i++;
		}
		?>
		</select><br />		
	<label for="tran_type_new">OR Create New Transaction Type:</label> <input type="text" name="tran_type_new" class="text" /><br />
	<label for="debit">Debit Amount:</label> <input name="debit" id="debit" type="text" size="15" maxlength="10"> <br />
	<label for="credit">Credit Amount:</label> <input name="credit" id="credit" type="text" size="15" maxlength="10"> <br /> <br />
	
	<input name="submit_button" class="button" type="submit" value="Add Transaction &gt;&gt;"  class="submit"> 
	
</form>

<?php
include_once('../Header_Footer/footer.html');
?>