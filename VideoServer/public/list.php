
<?php
$showExt = array(
    'mp4'
);
error_reporting(E_ERROR | E_PARSE);
$json = file_get_contents("http://192.168.1.100/home/createFromDB.php?host=".$_SERVER["HTTP_HOST"]);
//echo "http://192.168.1.100/home/createFromDB.php?host=".$_SERVER["HTTP_HOST"];
$array = json_decode($json);
foreach ($array->files as $key => $row) {
    $dates[$key] = $row->added;
    // of course, replace 0 with whatever is the date field's index
}
$filles = (array) $array->files;
array_multisort($dates, SORT_DESC, $filles);
$tell = 0;

$page=$_GET["page"];
$start=$_GET["start"];
$limit=intval($_GET["limit"])+intval($_GET["start"]);

?>
<?php
$i=0;
foreach ($array->his as $dir) {
    
    if ($dir->meta->hasPart != true) {
        if ($dir->meta->is_dir) {
?>
				<?php
            foreach ($dir->dir as $file) {
                if (in_array($file->meta->ext, $showExt)) {

                    if(($i<$limit) && ($i>=$start)){
                    	$ar["text"]=$file->meta->human;
                        $ar["tags"]=$file->meta->human;

    					$ar["video"]=$file->link->video;

    					$ar["id"]=$file->uniqid;
                    	$ar["html"]="Nuts";
                    	$ar["img"]=$file->link->thumb;
                    	$ar["state"]=$file->state;
                    	$ar["leaf"]=true;
                        $ar["group"]="Laatst bekeken";
                    	$jso["items"][]=$ar;
                    }

                        $i++;
                }
            }
            
?>

		        <?php
            
        } else {
            if (in_array($dir->meta->ext, $showExt)) {
                if($i<$limit && $i>=$start){
                    
                    $ar["text"]=$file->meta->human;
                    $ar["tags"]=explode(" ", $file->meta->human);
					$ar["video"]=$file->link->video;
                	$ar["html"]="Nuts";
                	$ar["leaf"]=true;
                	$ar["img"]=$file->link->thumb;
                	$ar["state"]=$file->state;
                	$ar["id"]=$file->uniqid;
                    $ar["group"]="Laatst bekeken";
                	$jso["items"][]=$ar;
                }
                $i++;
?>

			<?php
            }
        }
    }
}
?>




<?php
foreach ($filles as $dir) {
    if ($dir->meta->hasPart != true) {
        if ($dir->meta->is_dir) {
?>
				<?php
            foreach ($dir->dir as $file) {
                if (in_array($file->meta->ext, $showExt)) {
                    if($i<$limit && $i>=$start){
                        
                    	$ar["text"]=$file->meta->human;
                        $ar["tags"]=explode(" ", $file->meta->human);
    					$ar["video"]=$file->link->video;
                    	$ar["html"]="Nuts";
                    	$ar["leaf"]=true;
                    	$ar["img"]=$file->link->thumb;
                    	$ar["state"]=$file->state;
                    	$ar["id"]=$file->uniqid;
                        $ar["group"]="Map";
                    	$jso["items"][]=$ar;
                    }
                    $i++;
                }
            }
            

            
        } else {
            if (in_array($dir->meta->ext, $showExt)) {
                if($i<$limit && $i>=$start){
                    
				    $ar["text"]=$file->meta->human;
                    $ar["tags"]=explode(" ", $file->meta->human);
					$ar["video"]=$file->link->video;
                	$ar["html"]="Nuts";
                	$ar["leaf"]=true;
                	$ar["img"]=$file->link->thumb;
                	$ar["state"]=$file->state;
                	$ar["id"]=$file->uniqid;
                    $ar["group"]="Map";
                	$jso["items"][]=$ar;
                }
                $i++;
            }
        }
    }
}
$jso["totalCount"]=$i;
echo json_encode($jso);
?>