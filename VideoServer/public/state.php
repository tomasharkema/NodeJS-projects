<?php

$id=$_GET["id"];

$time=$_GET["time"];








$query="UPDATE  `home`.`dir` SET  `state` =  '".$time."' WHERE  `dir`.`uniqid` ='".$id."'";

$mysqli = new mysqli('localhost', 'root', 'fleismann', 'home');

$mysqli->query($query);
echo json_encode($mysqli->error);
?>