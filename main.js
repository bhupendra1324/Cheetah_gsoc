Cesium.Ion.defaultAccessToken =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJiZGU1NGNhYy1jN2MyLTQ2YTAtOTkzZS05OTUzOGZjNjliY2MiLCJpZCI6OTgyMzAsImlhdCI6MTY1NTcxMTEyNH0.c2_6dE0vgWs0lHZDfBtD4nLZpCXPCOII7gYdXjtIfao";
// console.log("Hello");
// const path = $("#path")[0].innerText;
// window.onload = () => {
//   $("#name").css("color", "red");
// };
var viewer = new Cesium.Viewer("cesiumContainer");
$("#submit").click(() => {
  let num = +$("#refer").val();
  if (num === 0) {
    num = 1140725;
  }
  const tileset = viewer.scene.primitives.add(
    new Cesium.Cesium3DTileset({
      url: Cesium.IonResource.fromAssetId(num),
    })
  );

  (async () => {
    try {
      await tileset.readyPromise;
      await viewer.zoomTo(tileset);

      // Apply the default style if it exists
      var extras = tileset.asset.extras;
      if (
        Cesium.defined(extras) &&
        Cesium.defined(extras.ion) &&
        Cesium.defined(extras.ion.defaultStyle)
      ) {
        tileset.style = new Cesium.Cesium3DTileStyle(extras.ion.defaultStyle);
      }
    } catch (error) {
      console.log(error);
    }
  })();
});
