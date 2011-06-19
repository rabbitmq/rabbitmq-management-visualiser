var model = {};
model.exchanges = {};
model.bindings = {};
model.queues = {};
model.connections = {};
model.channels = {};
model.rebuild = function(tree, configuration) {
    model.bindings.source = {};
    model.bindings.destination = {
        "exchange" : {},
        "queue" : {}
    };

    var elem;
    for ( var i = 0; i < configuration.bindings.length; ++i) {
        elem = configuration.bindings[i];
        if (undefined == model.bindings.source[elem.source]) {
            model.bindings.source[elem.source] = new Array(elem);
        } else {
            model.bindings.source[elem.source].push(elem);
        }

        if (undefined == model.bindings.destination[elem.destination_type][elem.destination]) {
            model.bindings.destination[elem.destination_type][elem.destination] = new Array(
                    elem);
        } else {
            model.bindings.destination[elem.destination_type][elem.destination]
                    .push(elem);
        }
    }

    var matched = {};
    for ( var i = 0; i < configuration.exchanges.length; ++i) {
        elem = configuration.exchanges[i];
        if (undefined == model.exchanges[elem.name]) {
            exchange.add(tree, elem);
        } else {
            exchange.update(elem);
        }
        matched[elem.name] = true;
    }
    for ( var i in model.exchanges) {
        if (undefined == matched[i]) {
            exchange.remove(model.exchanges[i]);
        }
    }

    matched = {};
    for ( var i = 0; i < configuration.queues.length; ++i) {
        elem = configuration.queues[i];
        if (undefined == model.queues[elem.name]) {
            queue.add(tree, elem);
        } else {
            queue.update(elem);
        }
        matched[elem.name] = true;
    }
    for ( var i in model.queues) {
        if (undefined == matched[i]) {
            queue.remove(model.queues[i]);
        }
    }

    matched = undefined;
};

var exchange = {
    yMax : 100,
    yIncr : 50,
    xInit : 100,
    xBoundary : 200,
    attributes : [ 'arguments', 'auto_delete', 'durable', 'internal', 'type',
            'message_stats_out', 'message_stats_in' ],
    pos : vec3.create()
};
exchange.canvasResized = function(canvas) {
    exchange.xInit = canvas.width / 6;
    exchange.xBoundary = 2 * canvas.width / 6;
};
exchange.add = function(tree, elem) {
    model.exchanges[elem.name] = elem;
    elem.pos = vec3.create();
    elem.pos[octtree.x] = exchange.xInit;
    elem.pos[octtree.y] = exchange.yMax;
    elem.pos[octtree.z] = 0;
    exchange.yMax += exchange.yIncr;
    elem.next_pos = vec3.create(elem.pos);
    elem.xMin = elem.pos[octtree.x];
    elem.xMax = elem.pos[octtree.x];
    elem.mass = 0.1;
    elem.velocity = vec3.create();
    tree.add(elem);
};
exchange.update = function(elem) {
    var e = model.exchanges[elem.name];
    var attr;
    for ( var i = 0; i < exchange.attributes.length; ++i) {
        attr = exchange.attributes[i];
        e[attr] = elem[attr];
    }
};
exchange.remove = function(elem) {
    delete model.exchanges[elem.name];
};
exchange.render = function(elem, ctx) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "12px sans-serif";

    var dim = ctx.measureText(elem.name);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "black";

    ctx.beginPath();
    ctx.arc(elem.pos[octtree.x] - (dim.width / 2), elem.pos[octtree.y], 12,
            Math.PI / 2, 3 * Math.PI / 2, false);
    ctx.lineTo(elem.pos[octtree.x] + (dim.width / 2), elem.pos[octtree.y] - 12);

    ctx.arc(elem.pos[octtree.x] + (dim.width / 2), elem.pos[octtree.y], 12,
            3 * Math.PI / 2, Math.PI / 2, false);
    ctx.closePath();
    if (undefined != exchange.postRender) {
        exchange.postRender(elem, ctx);
    }
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.fillText(elem.name, elem.pos[octtree.x], elem.pos[octtree.y]);

    elem.xMin = elem.pos[octtree.x] - (dim.width / 2) - 12;
    elem.xMax = elem.pos[octtree.x] + (dim.width / 2) + 12;
};
exchange.animate = function(elapsed, elem) {
    if (exchange.xBoundary > elem.pos[octtree.x]) {
        exchange.pos[octtree.x] = exchange.xInit;
        exchange.pos[octtree.y] = elem.pos[octtree.y];
        spring.pull = true;
        spring.push = false;
        spring.dampingFactor = 0.1;
        spring.equilibriumLength = 0;
        spring.apply(elapsed, elem, exchange);
    }
};

var queue = {
    yMax : 100,
    yIncr : 50,
    xInit : 400,
    xBoundary : 300,
    attributes : [ 'arguments', 'auto_delete', 'durable', 'messages',
            'messages_ready', 'messages_unacknowledged', 'message_stats' ],
    pos : vec3.create()
};
queue.canvasResized = function(canvas) {
    queue.xInit = 5 * canvas.width / 6;
    queue.xBoundary = 4 * canvas.width / 6;
};
queue.add = function(tree, elem) {
    model.queues[elem.name] = elem;
    elem.pos = vec3.create();
    elem.pos[octtree.x] = queue.xInit;
    elem.pos[octtree.y] = queue.yMax;
    elem.pos[octtree.z] = 0;
    queue.yMax += queue.yIncr;

    elem.next_pos = vec3.create(elem.pos);
    elem.xMin = elem.pos[octtree.x];
    elem.xMax = elem.pos[octtree.x];
    elem.mass = 0.1;
    elem.velocity = vec3.create();
    tree.add(elem);
};
queue.update = function(elem) {
    var q = model.queues[elem.name];
    var attr;
    for ( var i = 0; i < queue.attributes.length; ++i) {
        attr = queue.attributes[i];
        q[attr] = elem[attr];
    }
};
queue.remove = function(elem) {
    delete model.queues[elem.name];
};
queue.render = function(elem, ctx) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "12px sans-serif";
    var text = elem.name + " (" + elem.messages_ready + ", "
            + elem.messages_unacknowledged + ")";
    var dim = ctx.measureText(text);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(elem.pos[octtree.x] - (dim.width / 2) - 12,
            elem.pos[octtree.y] - 12);
    ctx.lineTo(elem.pos[octtree.x] + (dim.width / 2) + 12,
            elem.pos[octtree.y] - 12);
    ctx.lineTo(elem.pos[octtree.x] + (dim.width / 2) + 12,
            elem.pos[octtree.y] + 12);
    ctx.lineTo(elem.pos[octtree.x] - (dim.width / 2) - 12,
            elem.pos[octtree.y] + 12);
    ctx.closePath();

    if (undefined != queue.postRender) {
        queue.postRender(elem, ctx);
    }
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.fillText(text, elem.pos[octtree.x], elem.pos[octtree.y]);

    elem.xMin = elem.pos[octtree.x] - (dim.width / 2) - 12;
    elem.xMax = elem.pos[octtree.x] + (dim.width / 2) + 12;
};
queue.animate = function(elapsed, elem) {
    if (queue.xBoundary < elem.pos[octtree.x]) {
        queue.pos[octtree.x] = queue.xInit;
        queue.pos[octtree.y] = elem.pos[octtree.y];
        spring.pull = true;
        spring.push = false;
        spring.dampingFactor = 0.1;
        spring.equilibriumLength = 0;
        spring.apply(elapsed, elem, queue);
    }
};

var binding = {
    offset : 150
};
binding.render = function(elem, ctx) {
    var source = model.exchanges[elem.source];
    var destination;
    if (elem.destination_type == "exchange") {
        destination = model.exchanges[elem.destination];
    } else {
        destination = model.queues[elem.destination];
    }
    var xMid = (source.xMax + destination.xMin) / 2;
    var xMid1 = xMid > (source.xMax + binding.offset) ? xMid : source.xMax
            + binding.offset;
    var xMid2 = xMid < (destination.xMin - binding.offset) ? xMid
            : destination.xMin - binding.offset;
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "black";
    ctx.moveTo(source.xMax, source.pos[octtree.y]);

    ctx.bezierCurveTo(xMid1, source.pos[octtree.y], xMid2,
            destination.pos[octtree.y], destination.xMin,
            destination.pos[octtree.y]);
    ctx.stroke();

    // draw an arrow head
    ctx.beginPath();
    ctx.moveTo(destination.xMin, destination.pos[octtree.y]);
    ctx.lineTo(destination.xMin - 12, destination.pos[octtree.y] + 6);
    ctx.lineTo(destination.xMin - 12, destination.pos[octtree.y] - 6);
    ctx.closePath();
    ctx.fillStyle = "black";
    ctx.fill();

    // draw the binding key
    var yMid = (source.pos[octtree.y] + destination.pos[octtree.y]) / 2;
    ctx.font = "12px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.lineWidth = 6.0;
    ctx.strokeStyle = "white";
    ctx.strokeText(elem.routing_key, xMid, yMid);
    ctx.fillStyle = "black";
    ctx.fillText(elem.routing_key, xMid, yMid);
};
