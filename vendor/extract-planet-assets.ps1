$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$assetRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\assets'))
$packs=@(
 @{Archive='kenney_nature-kit.zip'; Folder='kenney-nature'; Prefix='Models/GLTF format/'; Models=@('tree_pineDefaultA.glb','tree_oak.glb','rock_largeA.glb','bridge_stone.glb','tree_detailed.glb','tree_detailed_fall.glb','tree_pineRoundA.glb','cliff_cave_rock.glb','cliff_blockCave_rock.glb','rock_tallA.glb','bridge_wood.glb')},
 @{Archive='kenney_castle-kit.zip'; Folder='kenney-castle'; Prefix='Models/GLB format/'; Models=@('tower-square-arch.glb','tower-square-top.glb','tower-square-roof.glb','wall.glb','tower-square-base.glb','tower-square-mid-windows.glb','tower-hexagon-base.glb','tower-hexagon-roof.glb','wall-narrow-gate.glb','bridge-straight.glb','wall-doorway.glb')},
 @{Archive='kenney_fantasy-town-kit_2.0.zip'; Folder='kenney-town'; Prefix='Models/GLB format/'; Models=@('wall.glb','wall-window-shutters.glb','wall-door.glb','wall-wood-detail-cross.glb','roof-high-point.glb','roof-gable.glb','roof-gable-end.glb','chimney.glb','stall-red.glb','stall-green.glb','cart.glb','fountain-round.glb','lantern.glb','fence.glb','wall-doorway-square-wide.glb','pillar-wood.glb')}
)
foreach($pack in $packs){
 $zip=[IO.Compression.ZipFile]::OpenRead((Join-Path 'F:\codex\paper-planet-assets' $pack.Archive))
 try {foreach($entry in $zip.Entries){
  $relative=$null
  if($entry.FullName -eq 'License.txt'){$relative='License.txt'}
  elseif($entry.FullName.StartsWith($pack.Prefix)){
   $name=$entry.FullName.Substring($pack.Prefix.Length)
   if($pack.Models -contains $name -or $name -match '\.(png|jpg)$'){$relative=$name}
  }
  if(!$relative){continue}
  $target=[IO.Path]::GetFullPath((Join-Path (Join-Path $assetRoot $pack.Folder) $relative))
  if(!$target.StartsWith($assetRoot+[IO.Path]::DirectorySeparatorChar)){throw 'Unsafe extraction path'}
  [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($target)) | Out-Null
  $source=$entry.Open();$dest=[IO.File]::Create($target)
  try{$source.CopyTo($dest)}finally{$source.Dispose();$dest.Dispose()}
 }}finally{$zip.Dispose()}
}
