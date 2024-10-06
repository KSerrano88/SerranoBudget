<!--------------------------------------------------------------------------------------
	12/17/2010
	Form to display transactions within a specific date range.

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



<!-- Form to display transaction history -->
<form class="form_element" method="post" action="transactions_display_form_response.php" name="display_transaction">
<h3>Display Transaction History </h3>
	<div class="Calendar">
		<!-- <p>Start Date:</p> -->
		<?php //Calendar
		//get class into the page
		//require_once("../Calendar/classes/tc_calendar.php");
		
		$cur_day = date("01");
		$cur_month = date("m");
		$cur_year = date("Y");

		//instantiate class and set properties
			//$displayCalendar = new tc_Calendar("date1", true);
			//$displayCalendar->setPath("../Calendar/calendar_form.php");
			//$displayCalendar->setIcon("../Calendar/images/iconCalendar.gif");
			//$displayCalendar->setDate($cur_day, $cur_month, $cur_year);
		//output the Calendar
			//$displayCalendar->writeScript();	   
		?>
		
		<!-- <p>End Date:</p> -->
		<?php //Calendar
		
		$cur_day = date("d");
		$cur_month = date("m");
		$cur_year = date("Y");

		//instantiate class and set properties
			//$displayCalendar = new tc_Calendar("date2", true);
			//$displayCalendar->setPath("../Calendar/calendar_form.php");
			//$displayCalendar->setIcon("../Calendar/images/iconCalendar.gif");
			//$displayCalendar->setDate($cur_day, $cur_month, $cur_year);
		//output the Calendar
			//$displayCalendar->writeScript();	   
		?>	
	</div>
	
	
	
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
		
		<div id="TranTypes">
			<label for="date1">Start Date:</label>  <input name="date1" id="date1" type="text" size="15" maxlength="10"> <br />
			<label for="date2">End Date:</label>  <input name="date2" id="date2" type="text" size="15" maxlength="10"> <br />
			<label for="tran_type">Transaction Type:</label>
			<select class="select" name="tran_type" id="tran_type">
			<option name="default"  value="0" selected>-- All Transactions --</option>
			<?php
				//Loop places array values into Select list
				$i=0;			
				while ($i<$num) {
				$tran_type = mysqli_result($result,$i,"TRAN_TYPE");
			?>
				<option name="$tran_type"><?php echo $tran_type; ?></option>
			
			<?php
				$i++;
				}
			?>
			</select>

			<label for="tran_type_contains">OR Transaction Type Contains:</label>
			<input type="text" name="tran_type_contains" id="tran_type_contains" class="text" />
		</div>
		
		<input name="submit_button"	type="submit" value="Display Transactions &gt;&gt;"  class="submit"> 
	
</form>


<?php
include_once('../Header_Footer/footer.html');
?>
