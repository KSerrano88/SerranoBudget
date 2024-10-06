
function textGlow(idText) {
var v_ColorRed = "00";
var v_ColorBlue = "00";
var v_ColorGreen = "00";
var v_Color = "000000";
var ar_ColorCodes = new Array("A","B","C","D","E","F","0","1","2","3","4","5","6","7","8","9");
var len = ar_ColorCodes.length;
/*
v_ColorBlue = (ar_ColorCodes[0] + ar_ColorCodes[5]);
v_Color = v_ColorRed + v_ColorBlue + v_ColorGreen;	
document.write(v_Color);
document.getElementById(idText).style.color = '#' + v_Color;
*/

/*
	for (var i=0; i<len; i++) {		
		var j = i%2;
		var ar_Value1 = ar_ColorCodes[i];
		var ar_Value2 = ar_ColorCodes[j];
		
		v_ColorRed = (ar_Value1 + ar_Value2);
		v_ColorBlue = (ar_Value1 + ar_Value2);
		v_ColorGreen = (ar_Value1 + ar_Value2);
		v_Color = v_ColorRed + v_ColorBlue + v_ColorGreen;	
		
		document.write(v_Color);
		
		window.setTimeout(textGlow(idText),10000);
		
		
	}
	
*/
}