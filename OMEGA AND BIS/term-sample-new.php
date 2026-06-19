
<link href='https://fonts.googleapis.com/css?family=Open+Sans' rel='stylesheet' type='text/css'>
<style>

body
{
	font-family: 'Open Sans', sans-serif;
	font-size:10px;

}

input
{
	font-family: 'Open Sans', sans-serif;
	font-size:15px;
	width:150px;

}

.button
{
	border:solid 1px silver;
	border-radius:2px;
	width:50px;
	float:left;
	margin-right:15px;
	text-align:center;
}

.selected
{
	background-color:#999999;
	color:white;;

}


</style>

<?php 

			  

if($_REQUEST['page']=='')
{
?>

<form id=frm action='' method=post>
<input type=hidden name=page value=calcs>

<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js"></script>
<table style='width:550px;'>
	<tr>
		<td style='border:1px solid silver;border-radius:5px;'>
			<table style='width:100%;'>
				<tr>
					<td style='width:35%;'></td>
					<td>Life 1</td>
					<td>Life 2</td>
				</tr>
				<tr>
					<td>Age/DOB</td>
					<td><input name=dob1></td>
					<td><input name=dob2></td>
				</tr>
				<tr>
					<td>Gender</td>
					<td>
						<div class='button selected' id=gender1M onclick="gender(1,'M')">M</div>
						<div class='button' id=gender1F onclick="gender(1,'F')">F<div>
					</td>
					<td>
						<div class='button'  id=gender2M onclick="gender(2,'M')">M</div>
						<div class='button selected'  id=gender2F onclick="gender(2,'F')">F<div>
					</td>
				</tr>
				<tr>
					<td>Smoker</td>
					<td>
						<div class='button selected' id=smoker1N onclick="smoker(1,'N')">N</div>
						<div class='button' id=smoker1Y onclick="smoker(1,'Y')">Y<div>
					</td>
					<td>
						<div class='button selected' id=smoker2N onclick="smoker(2,'N')">N</div>
						<div class='button' id=smoker2Y onclick="smoker(2,'Y')">Y<div>
					</td>
				</tr>
				<tr>
					<td>Sum Assured</td>
					<td><input name=lc1 value=200000></td>
					<td><input name=lc2 value=200000></td>
				</tr>
			</table>
		</td>
	</tr>
</table>
<br>
<table style='width:550px;'>
	<tr>
		<td style='border:1px solid silver;border-radius:5px;'>
			<table style='width:100%;'>
				<tr>
					<td style='width:35%;'>Term</td>
					<td><input name=term value=20></td>
				</tr>
			</table>
		</td>
	</tr>
</table>
<br>
<input type=submit value='Run Quotes'>


<input type=hidden name=sex1 value='M'>
<input type=hidden name=sex2 value='F'>
<input type=hidden name=smoker1 value='N'>
<input type=hidden name=smoker2 value='N'>

</form>


<script>

	function gender(life,ans)
	{
		if (ans=='M')
		{
			other='F';
		}
		else
		{
			other='M';
		}
		
		$('#gender'+life+ans).addClass('selected')
		$('#gender'+life+other).removeClass('selected')
		$('#sex'+life).val(ans)
	}

	function smoker(life,ans)
	{
		if (ans=='N')
		{
			other='Y';
		}
		else
		{
			other='N';
		}
		
		$('#smoker'+life+ans).addClass('selected')
		$('#smoker'+life+other).removeClass('selected')
		$('#smoker'+life).val(ans)
	}

</script>


<?

exit();
}
else 
{
	

if($_REQUEST['sex1']=='M')
{
	$_REQUEST['sex1']='Male';
}
else 
{
	$_REQUEST['sex1']='Female';
}

if($_REQUEST['sex2']=='M')
{
	$_REQUEST['sex2']='Male';
}
else 
{
	$_REQUEST['sex2']='Female';
}

if($_REQUEST['smoker1']=='N')
{
	$_REQUEST['smoker1']='Non-Smoker';
}
else 
{
	$_REQUEST['smoker1']='Smoker';
}

if($_REQUEST['smoker2']=='N')
{
	$_REQUEST['smoker2']='Non-Smoker';
}
else 
{
	$_REQUEST['smoker2']='Smoker';
}



/* fill your details here */

$system_name="?";
$system_code="?";
$username="?";
$password="?";

$xml = "<Inputs>";
$xml.= "<Authentication>";
$xml.= "<Username>$username</Username>";
$xml.= "<Password>$password</Password>";
$xml.= "<RequestType>Term</RequestType>";
$xml.= "<RequestFrom>$system_name</RequestFrom>";
$xml.= "<RequestFromCode>$system_code</RequestFromCode>";
$xml.= "</Authentication>";

$xml.= "<Life1>";
$xml.= "<DOB>{$_REQUEST['dob1']}</DOB>";
$xml.= "<Sex>{$_REQUEST['sex1']}</Sex>";
$xml.= "<Smoker>{$_REQUEST['smoker1']}</Smoker>";
$xml.= "<LifeCover>{$_REQUEST['lc1']}</LifeCover>";
$xml.= "</Life1>";

$xml.= "<Life2>";
$xml.= "<DOB>{$_REQUEST['dob2']}</DOB>";
$xml.= "<Sex>{$_REQUEST['sex2']}</Sex>";
$xml.= "<Smoker>{$_REQUEST['smoker2']}</Smoker>";
$xml.= "<LifeCover>{$_REQUEST['lc2']}</LifeCover>";
$xml.= "</Life2>";

$xml.= "<Plan>";
$xml.= "<Term>{$_REQUEST['term']}</Term>";
$xml.= "<Indexation>N</Indexation>";
$xml.= "<MortgageInterest>6</MortgageInterest>";
$xml.= "<Frequency>Monthly</Frequency>";
$xml.= "<QuoteLifeOnly>Y</QuoteLifeOnly>";
$xml.= "<QuoteLifeAccelerated>N</QuoteLifeAccelerated>";
$xml.= "<QuoteLifeIllness>N</QuoteLifeIllness>";
$xml.= "<QuoteIllnessOnly>N</QuoteIllnessOnly>";
$xml.= "</Plan>";
$xml.= "</Inputs>";



//print("<xmp>$xml</xmp><p><p>");


$url = 'http://www.bestadvice.ie/interface3.php';
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, "xml=".urlencode($xml));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, 1);
$xml_result=curl_exec($ch);
curl_close($ch);

//print("[".$xml_result."]");
$xml = simplexml_load_string($xml_result);

//print_r($xml);
if($xml->Errors!='')
{
	die("<div>Error:".$xml->Errors."</div>");
}



if($_REQUEST['dob2']!='')
{
	foreach($xml->Outputs->Quotes->Type as $quoteBlock)
	{
		
		$blockDesc=(string)$quoteBlock->Desc;
		
		foreach($quoteBlock->Company as $arr)
		{
			$companyName=(string)$arr->Name;
			$premium=(string)$arr->JMortgage;
			$quote[$blockDesc][$companyName]=$premium;
		}
		
	}
}
else 
{
	foreach($xml->Outputs->Quotes->Type as $quoteBlock)
	{
		
		$blockDesc=(string)$quoteBlock->Desc;
		
		foreach($quoteBlock->Company as $arr)
		{
			$companyName=(string)$arr->Name;
			$premium=(string)$arr->SMortgage;
			$quote[$blockDesc][$companyName]=$premium;
		}
		
	}
}

//print_r($quote);
foreach($quote['Life Cover Only'] as $key=>$val)
{
	$html.="<tr><td>$key</td><td>$val</td></tr>";
}

?>
<table style='width:550px;'>
	<tr>
		<td style='border:1px solid silver;border-radius:5px;'>
			<table style='width:100%;'>
				<tr>
					<td style='width:35%;'><u>Provider</td>
					<td><u>Premium</td>
				</tr>
				<?=$html?>
				<tr>
					<td>&nbsp;</td>
					<td>&nbsp;</td>
				</tr>
			</table>
		</td>
	</tr>
</table>


<?
//print("<table>$html</table>");

//print("<xmp>$xml_result</xmp>");
	
			
}
?>