function Model() {
    this.source = {};
    this.destination = {
        "exchange" : {},
        "queue" : {}
    };
};
Model.prototype.exchanges = {};
Model.prototype.bindings = {};
Model.prototype.queues = {};
Model.prototype.connections = {};
Model.prototype.channels = {};
Model.prototype.rebuild = function(tree, configuration) {
    this.bindings.source = {};
    this.bindings.destination = {
        "exchange" : {},
        "queue" : {}
    };

    var elem;
    for ( var i = 0; i < configuration.bindings.length; ++i) {
        elem = configuration.bindings[i];
        if (undefined == this.bindings.source[elem.source]) {
            this.bindings.source[elem.source] = new Array(elem);
        } else {
            this.bindings.source[elem.source].push(elem);
        }

        if (undefined == this.bindings.destination[elem.destination_type][elem.destination]) {
            this.bindings.destination[elem.destination_type][elem.destination] = new Array(
                    elem);
        } else {
            this.bindings.destination[elem.destination_type][elem.destination]
                    .push(elem);
        }
    }

    var matched = {};
    for ( var i = 0; i < configuration.exchanges.length; ++i) {
        elem = configuration.exchanges[i];
        if (undefined == this.exchanges[elem.name]) {
            exchange.add(this, tree, elem);
        } else {
            exchange.update(this, elem);
        }
        matched[elem.name] = true;
    }
    for ( var i in this.exchanges) {
        if (undefined == matched[i]) {
            exchange.remove(this, tree, this.exchanges[i]);
        }
    }

    matched = {};
    for ( var i = 0; i < configuration.queues.length; ++i) {
        elem = configuration.queues[i];
        if (undefined == this.queues[elem.name]) {
            queue.add(this, tree, elem);
        } else {
            queue.update(this, elem);
        }
        matched[elem.name] = true;
    }
    for ( var i in this.queues) {
        if (undefined == matched[i]) {
            queue.remove(this, tree, this.queues[i]);
        }
    }

    matched = undefined;
};

var exchange = {
    yTop : 100,
    yMax : 100,
    yIncr : 50,
    xInit : 100,
    xBoundary : 200,
    attributes : [ 'arguments', 'auto_delete', 'durable', 'internal', 'type',
            'message_stats_out', 'message_stats_in' ],
    pos : vec3.create(),
    fontSize : 12,
    spring : new Spring(),
};
exchange.spring.octtreeLimit = 10;
exchange.spring.octtreeRadius = 500;
exchange.spring.equilibriumLength = 0;
exchange.spring.dampingFactor = 0.1;
exchange.spring.pull = true;
exchange.spring.push = false;

exchange.canvasResized = function(canvas) {
    exchange.xInit = canvas.width / 6;
    exchange.xBoundary = 2 * canvas.width / 6;
};
exchange.add = function(model, tree, elem) {
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
exchange.update = function(model, elem) {
    var e = model.exchanges[elem.name];
    var attr;
    for ( var i = 0; i < exchange.attributes.length; ++i) {
        attr = exchange.attributes[i];
        e[attr] = elem[attr];
    }
};
exchange.remove = function(model, tree, elem) {
    tree.del(elem);
    delete model.exchanges[elem.name];
    exchange.yMax = exchange.yTop;
    for ( var i in model.exchanges) {
        exchange.yMax = Math.max(exchange.yMax,
                model.exchages[i].pos[octtree.y] + exchange.yIncr);
    }
};
exchange.render = function(model, elem, ctx) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "" + exchange.fontSize + "px sans-serif";

    var dim = ctx.measureText(elem.name);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "black";

    ctx.beginPath();
    ctx.arc(elem.pos[octtree.x] - (dim.width / 2), elem.pos[octtree.y],
            exchange.fontSize, Math.PI / 2, 3 * Math.PI / 2, false);
    ctx.lineTo(elem.pos[octtree.x] + (dim.width / 2), elem.pos[octtree.y]
            - exchange.fontSize);

    ctx.arc(elem.pos[octtree.x] + (dim.width / 2), elem.pos[octtree.y],
            exchange.fontSize, 3 * Math.PI / 2, Math.PI / 2, false);
    ctx.closePath();
    if (undefined != exchange.postRender) {
        exchange.postRender(elem, ctx);
    }
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.fillText(elem.name, elem.pos[octtree.x], elem.pos[octtree.y]);

    elem.xMin = elem.pos[octtree.x] - (dim.width / 2) - exchange.fontSize;
    elem.xMax = elem.pos[octtree.x] + (dim.width / 2) + exchange.fontSize;

    exchange.yMax = Math.max(exchange.yMax, elem.pos[octtree.y]
            + exchange.yIncr);
};
exchange.animate = function(elapsed, elem) {
    if (exchange.xBoundary > elem.pos[octtree.x]) {
        exchange.pos[octtree.x] = exchange.xInit;
        exchange.pos[octtree.y] = elem.pos[octtree.y];
        exchange.spring.apply(elapsed, elem, exchange);
    }
};

var queue = {
    yMax : 100,
    yTop : 100,
    yIncr : 50,
    xInit : 400,
    xBoundary : 300,
    attributes : [ 'arguments', 'auto_delete', 'durable', 'messages',
            'messages_ready', 'messages_unacknowledged', 'message_stats' ],
    pos : vec3.create(),
    fontSize : 12,
    spring : new Spring()
};
queue.spring.octtreeLimit = 10;
queue.spring.octtreeRadius = 500;
queue.spring.equilibriumLength = 0;
queue.spring.dampingFactor = 0.1;
queue.spring.pull = true;
queue.spring.push = false;

queue.canvasResized = function(canvas) {
    queue.xInit = 5 * canvas.width / 6;
    queue.xBoundary = 4 * canvas.width / 6;
};
queue.add = function(model, tree, elem) {
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
queue.update = function(model, elem) {
    var q = model.queues[elem.name];
    var attr;
    for ( var i = 0; i < queue.attributes.length; ++i) {
        attr = queue.attributes[i];
        q[attr] = elem[attr];
    }
};
queue.remove = function(model, tree, elem) {
    tree.del(elem);
    delete model.queues[elem.name];
    queue.yMax = queue.yTop;
    for ( var i in model.queues) {
        queue.yMax = Math.max(queue.yMax, model.queues[i].pos[octtree.y]
                + queue.yIncr);
    }
};
queue.render = function(model, elem, ctx) {
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "" + queue.fontSize + "px sans-serif";
    var text = elem.name + " (" + elem.messages_ready + ", "
            + elem.messages_unacknowledged + ")";
    var dim = ctx.measureText(text);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(elem.pos[octtree.x] - (dim.width / 2) - queue.fontSize,
            elem.pos[octtree.y] - queue.fontSize);
    ctx.lineTo(elem.pos[octtree.x] + (dim.width / 2) + queue.fontSize,
            elem.pos[octtree.y] - queue.fontSize);
    ctx.lineTo(elem.pos[octtree.x] + (dim.width / 2) + queue.fontSize,
            elem.pos[octtree.y] + queue.fontSize);
    ctx.lineTo(elem.pos[octtree.x] - (dim.width / 2) - queue.fontSize,
            elem.pos[octtree.y] + queue.fontSize);
    ctx.closePath();

    if (undefined != queue.postRender) {
        queue.postRender(elem, ctx);
    }
    ctx.stroke();

    ctx.fillStyle = "black";
    ctx.fillText(text, elem.pos[octtree.x], elem.pos[octtree.y]);

    elem.xMin = elem.pos[octtree.x] - (dim.width / 2) - queue.fontSize;
    elem.xMax = elem.pos[octtree.x] + (dim.width / 2) + queue.fontSize;

    queue.yMax = Math.max(queue.yMax, elem.pos[octtree.y] + queue.yIncr);
};
queue.animate = function(elapsed, elem) {
    if (queue.xBoundary < elem.pos[octtree.x]) {
        queue.pos[octtree.x] = queue.xInit;
        queue.pos[octtree.y] = elem.pos[octtree.y];
        queue.spring.apply(elapsed, elem, queue);
    }
};

var binding = {
    offset : 150,
    fontSize : 12
};
binding.render = function(model, elem, ctx) {
    var source = model.exchanges[elem.source];
    var destination;
    if (elem.destination_type == "exchange") {
        destination = model.exchanges[elem.destination];
    } else {
        destination = model.queues[elem.destination];
    }
    if (undefined == source || undefined == destination) {
        return;
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
    ctx.lineTo(destination.xMin - binding.fontSize, destination.pos[octtree.y]
            + (binding.fontSize / 2));
    ctx.lineTo(destination.xMin - binding.fontSize, destination.pos[octtree.y]
            - (binding.fontSize / 2));
    ctx.closePath();
    ctx.fillStyle = "black";
    ctx.fill();

    // draw the binding key
    var yMid = (source.pos[octtree.y] + destination.pos[octtree.y]) / 2;
    ctx.font = "" + binding.fontSize + "px sans-serif";
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.lineWidth = binding.fontSize / 2;
    ctx.strokeStyle = "white";
    ctx.strokeText(elem.routing_key, xMid, yMid);
    ctx.fillStyle = "black";
    ctx.fillText(elem.routing_key, xMid, yMid);
};
