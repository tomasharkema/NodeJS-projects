<?php
$id=$_GET["id"];

$mysqli = new mysqli('localhost', 'root', 'fleismann', 'home');
$result=$mysqli->query("SELECT * FROM  `dir` WHERE  `uniqid` =  '".$id."' LIMIT 0 , 1");




$row = $result->fetch_array(MYSQLI_ASSOC);
$mysqli->query("INSERT INTO  `home`.`his` (
`id` ,
`uniqid` ,
`time` ,
`ip` ,
`child`
)
VALUES (
NULL ,  '".$row["parent"]."',  '".time()."',  '".$_SERVER["REMOTE_ADDR"]."', '".$row["uniqid"]."'
);
");

?>