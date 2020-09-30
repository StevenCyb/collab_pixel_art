// Show room code
var code = new URLSearchParams(window.location.search).get('code');
document.getElementById('room-code').value = code;
// Color options
var colorPalette = document.getElementById('color-palette'),
    selectedColor = 0,
    colorButtons = [],
    colorList = [
        [0,0,0], [50,50,50], [100,100,100], [150,150,150], [200,200,200], [255,255,255],
        [50,0,0], [100,0,0], [150,0,0], [200,0,0], [250,0,0],
        [0,50,0], [0,100,0], [0,150,0], [0,200,0], [0,250,0],
        [0,0,50], [0,0,100], [0,0,150], [0,0,200], [0,0,250],
        [50,50,0], [100,100,0], [150,150,0], [200,200,0], [250,250,0],
        [50,0,50], [100,0,100], [150,0,150], [200,0,200], [250,0,250],
        [0,50,50], [0,100,100], [0,150,150], [0,200,200], [0,250,250]
    ];
for(var i=0; i<colorList.length; i++) {
    var e = document.createElement('button');
    e.classList.add('option-button');
    e.style.backgroundColor = `rgb(${colorList[i]})`;
    e.setAttribute('index', i);
    if(i == selectedColor) {
        e.classList.add('option-selected');
    }
    e.addEventListener('click', (e) => { 
        colorButtons[selectedColor].classList.remove('option-selected');
        selectedColor = e.target.getAttribute('index');
        colorButtons[selectedColor].classList.add('option-selected');
    });
    colorButtons.push(e);
    colorPalette.appendChild(e);
}

// General canvas operations
var canvas = document.getElementById('pixel-space'),
    context = canvas.getContext('2d'),
    gridSize = canvas.getBoundingClientRect().width / size
    isDrawing = false,
    x = 0, 
    y = 0;
canvas.width  = size;
canvas.height = size;
function pixel2Grid(x, y) {
    var gridX = 0, gridY = 0,
        xFound = false, yFound = false;
    for(var i=0; i < size; i++) {
        if(i * gridSize < x) {
            gridX = i;
        } else {
            xFound = true;
        }
        if(i * gridSize < y) {
            gridY = i;
        } else {
            yFound = true;
        }
        if(xFound && yFound) {
            break;
        }
    }
    return [gridX, gridY];
}
function drawPixel(x, y, r, g, b, isRemote=false) {
    var imageData = context.getImageData(0, 0, size, size),
        index = 4 * (x + y * size);
    imageData.data[index] = r;
    imageData.data[index+1] = g;
    imageData.data[index+2] = b;
    imageData.data[index+3] = 255;
    context.putImageData(imageData, 0, 0);
    if(!isRemote) {
        socket.emit('draw_pixel', { code: code, data: [x, y, r, g, b] });
    }
}
// Mouse events
function getMousePos(e) {
    var rect = canvas.getBoundingClientRect();
    return pixel2Grid(e.clientX - rect.left, e.clientY - rect.top);
}
canvas.addEventListener('mousedown', e => {
    var pos = getMousePos(e);
    x = pos[0];
    y = pos[1];
    drawPixel(x, y, colorList[selectedColor][0], colorList[selectedColor][1], colorList[selectedColor][2]);
    isDrawing = true;
}, false);
canvas.addEventListener('mousemove', e => {
    if (isDrawing === true) {
        var pos = getMousePos(e);
        drawPixel(x, y, colorList[selectedColor][0], colorList[selectedColor][1], colorList[selectedColor][2]);
        pos = pixel2Grid(e.offsetX, e.offsetY);
        x = pos[0];
        y = pos[1];
    }
}, false);
canvas.addEventListener('mouseup', e => {
    isDrawing = false;
}, false);
// Touch events
function getTouchPos(e) {
    var rect = canvas.getBoundingClientRect();
    return pixel2Grid(e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top);
}
canvas.addEventListener("touchstart", function (e) {
    var pos = getTouchPos(e);
    x = pos[0];
    y = pos[1];
    drawPixel(x, y, colorList[selectedColor][0], colorList[selectedColor][1], colorList[selectedColor][2]);
    isDrawing = true;
}, false);
canvas.addEventListener("touchmove", function (e) {
    var touch = e.touches[0];
    canvas.dispatchEvent(new MouseEvent("mousemove", {
        clientX: touch.clientX,
        clientY: touch.clientY
    }));
    var pos = getTouchPos(e);
    x = pos[0];
    y = pos[1];
    drawPixel(x, y, colorList[selectedColor][0], colorList[selectedColor][1], colorList[selectedColor][2]);
}, false);
canvas.addEventListener("touchend", function (e) {
    var mouseEvent = new MouseEvent("mouseup", {});
    canvas.dispatchEvent(mouseEvent);
}, false);
// Prevent scrolling when touching the canvas
document.body.addEventListener("touchstart", function (e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, false);
document.body.addEventListener("touchend", function (e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, false);
document.body.addEventListener("touchmove", function (e) {
    if (e.target == canvas) {
        e.preventDefault();
    }
}, false);

// Download option
var saveButton = document.getElementById('save');
saveButton.addEventListener('click', () => {
    var rawImageData = canvas.toDataURL("image/png;base64");
    rawImageData = rawImageData.replace("image/png", "image/octet-stream");
    var downloadLink = document.createElement('a');
    downloadLink.setAttribute('download', 'Collab_Pixel_Art.png');
    downloadLink.setAttribute('href', rawImageData);
    downloadLink.click();
});

// Import and export option 
var importButton = document.getElementById('import'),
    exportButton = document.getElementById('export');
function overrideCanvas(importData) {
    var imageData = context.getImageData(0, 0, size, size),
    importData = importData.split(',');
    for(var i=0; i<importData.length; i++) {
        if(i >= imageData.data.length) {
            break;
        }
        imageData.data[i] = importData[i];
    }
    context.putImageData(imageData, 0, 0);
}
importButton.addEventListener('click', () => {
    var dialog = document.createElement('input');
    dialog.setAttribute('type', 'file');
    dialog.setAttribute('accept', '.cpa');
    dialog.addEventListener('change', () => {
        if(dialog.files.length > 0) {
            const reader = new FileReader();
            reader.onload = (importData) => {
                importData = importData.target.result;
                overrideCanvas(importData);
                socket.emit('override_canvas', { code: code, data: importData });
            };
            reader.readAsText(dialog.files[0])
        }
    });
    dialog.click();
});
exportButton.addEventListener('click', () => {
    var imageData = context.getImageData(0, 0, size, size),
        exportData = '';
    for(var i=0; i<imageData.data.length; i++) {
        exportData += imageData.data[i] + (i<(imageData.data.length - 1)? ',' : '');
    }
    var downloadLink = document.createElement('a');
    downloadLink.setAttribute('download', 'Collab_Pixel_Art.cpa');
    downloadLink.setAttribute('href', window.URL.createObjectURL(new Blob([exportData], {type: "text/csv;charset=utf-8;"})));
    downloadLink.click();
});

// Canvas clear option
var clearButton = document.getElementById('clear');
clearButton.addEventListener('click', () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
    socket.emit('clear_canvas', code);
});

// Socket.io
var activeUsers = document.getElementById('active-users'),
    socket = io();

socket.on('active_user_count', (count) => {
    activeUsers.value = count;
});

socket.on('clear_canvas', () => {
    context.clearRect(0, 0, canvas.width, canvas.height);
});

socket.on('draw_pixel', (data) => {
    drawPixel(data[0], data[1], data[2], data[3], data[4], true);
});

socket.on('override_canvas', (importData) => {
    overrideCanvas(importData);
});

socket.emit('join_room', code);

setInterval(function() {
    if(!socket.connected) {
        window.location.href = '/';
        return;
    }
    socket.emit("heartbeat", "0");
}, 5000);

(window.attachEvent || window.addEventListener)(window.attachEvent ? 'onbeforeunload' : 'beforeunload', function (e) {
    if(activeUsers.value <= 2) {
        var confirmationMessage = 'You are alone in this room. If you leave or reload the page, the room will automatically close and the data will be lost.';
        if (e || window.event) {
            (e || window.event).returnValue = confirmationMessage;
        }
        return confirmationMessage;
    }
});