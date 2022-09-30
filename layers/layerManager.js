
import { Layer } from './layer.js'

export class LayerManager { 
    constructor(core){
    this.layers = new Array();
    this.currentLayer = "0";
    this.core = core;

    this.addStandardLayers()

}


getLayers() {
    return this.layers;
}

layerCount() {
    return this.layers.length;
}

newLayer() {

    this.addLayer({
        "name": this.getUniqueName("NEW_LAYER")
    });
}

getUniqueName = function(name){
	
	var count = 0;
    var layStr = name.replace(/ /g, "_").toUpperCase();
    console.log("New Layer Name:" + layStr)
    for (var i = 0; i < this.layerCount(); i++) {
        if (this.layers[i].name.includes(layStr)) {
            count = count + 1;
        }
    }
    if (count > 0) {
        layStr = layStr + "_" + count;
    }

	return layStr;
}

addLayer(layer) {
    console.log(" layermanager.js - addlayer() - New Layer Added:" + layer.name)
    var newLayer = new Layer(layer);
    if (!this.layerExists(layer)) {
        this.layers.push(newLayer);
        this.core.scene.saveRequired();
    }
}

deleteLayer(layerIndex) {

    var layerToDelete = this.getLayerByIndex(layerIndex).name;

    if (layerToDelete.toUpperCase() === "DEFPOINTS") {
        console.log("Warning: DEFPOINTS layer cannot be deleted")
        return;
    }

    /*
      for (var i = 0; i < items.length; i++) {
          if (items[i].layer === layerToDelete) {
              count++
          }
      }
      */

    var selectionSet = [];

    for (var i = 0; i < this.core.scene.items.length; i++) {
        if (items[i].layer === layerToDelete) {
            selectionSet.push(i)
        }
    }

    console.log(selectionSet.length, " Item(s) to be deleted from ", layerToDelete);

    selectionSet.sort();
    for (var j = 0; j < selectionSet.length; j++) {
        items.splice((selectionSet[j] - j), 1)
    }

    //Delete The Layer
    this.layers.splice(layerIndex, 1);
}

getCLayer() {
    return this.currentLayer;
}

setCLayer(clayer) {
    this.currentLayer = clayer;
}

layerExists(layer) {
    var i = this.layerCount();
    while (i--) {
        //console.log("layerExists:", this.layers[i].name)
        if (this.layers[i].name === layer.name) {
            //console.log("layerManager.js LayerExist: " + layer.name)
            return true;
        }
    }
    //console.log("Layer Doesn't Exist: " + layer.name)
    return false;
}

checkLayers() {

    if (!this.layerCount()) {
        console.log("layermanager.js - Check Layers -> Add Standard Layers")
        this.addStandardLayers();
    }

    for (var i = 0; i < this.core.scene.items.length; i++) {
        var layer = (this.core.scene.items[i].layer)
        this.addLayer({
            "name": layer
        })
    }
}

addStandardLayers() {
    this.addLayer({
        "name": "0",
        "colour": "#00BFFF"
    });
    this.addLayer({
        "name": "DEFPOINTS",
        "plotting": false
    });
    this.core.scene.saveRequired();
}


layerVisible(layer) {
    for (var i = 0; i < this.layers.length; i++) {
        if (this.layers[i].name === layer) {

            if (this.layers[i].on || this.layers[i].frozen) {
                return true;
            }

            return false;
            break;
        }
    }

}

getLayerByName(layerName) {

    for (var i = 0; i < this.layerCount(); i++) {
        if (this.layers[i].name === layerName) {

            return this.layers[i];
            break;
        }
    }
}

getLayerByIndex(layerIndex) {

    return this.layers[layerIndex];
}


renameLayer(layerIndex, newName) {
	
	var newName = this.getUniqueName(newName)

    if (this.getLayerByIndex(layerIndex).name.toUpperCase() !== "DEFPOINTS") {
        
        if (this.getLayerByIndex(layerIndex).name === this.getCLayer()) {	
            this.setCLayer(newName);
            console.log("[Layernamanger.renameLayer] - set new Clayer name")
        }
        
        this.layers[layerIndex].name = newName;
    }
}
}
