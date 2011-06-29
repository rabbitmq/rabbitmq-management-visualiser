function Model() {
    this.exchanges = {};
    this.exchanges_visible = 0;
    this.bindings = {
        source : {},
        destination : {
            "exchange" : {},
            "queue" : {}
        }
    };
    this.queues = {};
    this.queues_visible = 0;
    this.connections = {};
    this.channels = {};
};

Model.prototype.permitted_exchanges_visible = 10;
Model.prototype.permitted_queues_visible = 10;

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
    for (var i = 0; i < configuration.exchanges.length; ++i) {
        elem = configuration.exchanges[i];
        if (undefined == this.exchanges[elem.name]) {
            this.exchanges[elem.name] = new Exchange(tree, elem);
            this.exchanges_visible++;
            if (elem.name.slice(0,4) == "amq." ||
                (this.exchanges_visible >
                 this.permitted_exchanges_visible)) {
                this.disable(this.exchanges[elem.name], tree);
            }
        } else {
            this.exchanges[elem.name].update(elem);
        }
        matched[elem.name] = true;
    }
    for (var i in this.exchanges) {
        if (undefined == matched[i]) {
            elem = this.exchanges[i];
            delete this.exchanges[i];
            elem.remove(tree);
            if (! elem.disabled) {
                this.exchanges_visible--;
            }
        }
    }

    matched = {};
    for ( var i = 0; i < configuration.queues.length; ++i) {
        elem = configuration.queues[i];
        if (undefined == this.queues[elem.name]) {
            this.queues[elem.name] = new Queue(tree, elem);
            this.queues_visible++;
            if ((this.queues_visible >
                 this.permitted_queues_visible)) {
                this.disable(this.queues[elem.name], tree);
            }
        } else {
            this.queues[elem.name].update(elem);
        }
        matched[elem.name] = true;
    }
    for (var i in this.queues) {
        if (undefined == matched[i]) {
            elem = this.queues[i];
            delete this.queues[i];
            elem.remove(tree);
            if (! elem.disabled) {
                this.queues_visible--;
            }
        }
    }

    matched = undefined;
};
Model.prototype.disable = function(elem, tree) {
    elem.disable(this);
    tree.del(elem);
    elem.disabled = true;
};
Model.prototype.enable = function(elem, tree) {
    elem.enable(this);
    tree.add(elem);
    elem.disabled = false;
};

function Exchange(tree, elem) {
    this.name = elem.name;
    this.pos = vec3.create();
    this.pos[octtree.x] = this.xInit;
    this.pos[octtree.y] = this.yMax;
    this.pos[octtree.z] = 0;
    Exchange.prototype.yMax += this.yIncr;
    this.next_pos = vec3.create(this.pos);
    this.xMin = this.pos[octtree.x];
    this.xMax = this.pos[octtree.x];
    this.mass = 0.1;
    this.velocity = vec3.create();
    this.ideal = { pos : vec3.create() };
    this.disabled = false;
    tree.add(this);
};

Exchange.prototype = {
    yTop : 100,
    yMax : 100,
    yIncr : 50,
    xInit : 100,
    xBoundary : 200,
    attributes : [ 'arguments', 'auto_delete', 'durable', 'internal', 'type',
                   'message_stats_out', 'message_stats_in' ],
    pos : vec3.create(),
    fontSize : 12,
    spring : new Spring()
};
Exchange.prototype.spring.octtreeLimit = 10;
Exchange.prototype.spring.octtreeRadius = 500;
Exchange.prototype.spring.equilibriumLength = 0;
Exchange.prototype.spring.dampingFactor = 0.1;
Exchange.prototype.spring.pull = true;
Exchange.prototype.spring.push = false;

Exchange.prototype.canvasResized = function(canvas) {
    Exchange.prototype.xInit = canvas.width / 6;
    Exchange.prototype.xBoundary = 2 * canvas.width / 6;
};
Exchange.prototype.update = function(elem) {
    var attr;
    for ( var i = 0; i < this.attributes.length; ++i) {
        attr = this.attributes[i];
        this[attr] = elem[attr];
    }
};
Exchange.prototype.remove = function(tree) {
    tree.del(this);
    Exchange.prototype.yMax = this.yTop;
    for (var i in model.exchanges) {
        Exchange.prototype.yMax =
            Math.max(Exchange.prototype.yMax,
                     model.exchages[i].pos[octtree.y] + this.yIncr);
    }
};
Exchange.prototype.render = function(model, ctx) {
    if (this.disabled) {
        return;
    }
    ctx.beginPath();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    var dim = ctx.measureText(this.name);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "black";

    ctx.arc(this.pos[octtree.x] - (dim.width / 2), this.pos[octtree.y],
            this.fontSize, Math.PI / 2, 3 * Math.PI / 2, false);
    ctx.lineTo(this.pos[octtree.x] + (dim.width / 2), this.pos[octtree.y]
            - this.fontSize);

    ctx.arc(this.pos[octtree.x] + (dim.width / 2), this.pos[octtree.y],
            this.fontSize, 3 * Math.PI / 2, Math.PI / 2, false);
    ctx.closePath();

    this.preStroke(ctx);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(this.name, this.pos[octtree.x], this.pos[octtree.y]);

    this.xMin = this.pos[octtree.x] - (dim.width / 2) - this.fontSize;
    this.xMax = this.pos[octtree.x] + (dim.width / 2) + this.fontSize;

    Exchange.prototype.yMax = Math.max(Exchange.prototype.yMax,
                                       this.pos[octtree.y] + this.yIncr);
};
Exchange.prototype.preStroke = function(ctx) {
};
Exchange.prototype.animate = function(elapsed) {
    if (this.xBoundary > this.pos[octtree.x]) {
        this.ideal.pos[octtree.x] = this.xInit;
        this.ideal.pos[octtree.y] = this.pos[octtree.y];
        this.spring.apply(elapsed, this, this.ideal);
    }
};
Exchange.prototype.disable = function(model) {
    model.exchanges_visible--;
};
Exchange.prototype.enable = function(model) {
    model.exchanges_visible++;
};

function Queue(tree, elem) {
    this.name = elem.name;
    this.pos = vec3.create();
    this.pos[octtree.x] = this.xInit;
    this.pos[octtree.y] = this.yMax;
    this.pos[octtree.z] = 0;
    Queue.prototype.yMax += this.yIncr;

    this.next_pos = vec3.create(this.pos);
    this.xMin = this.pos[octtree.x];
    this.xMax = this.pos[octtree.x];
    this.mass = 0.1;
    this.velocity = vec3.create();
    this.ideal = { pos : vec3.create() };
    this.disabled = false;
    tree.add(this);
}

Queue.prototype = {
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
Queue.prototype.spring.octtreeLimit = 10;
Queue.prototype.spring.octtreeRadius = 500;
Queue.prototype.spring.equilibriumLength = 0;
Queue.prototype.spring.dampingFactor = 0.1;
Queue.prototype.spring.pull = true;
Queue.prototype.spring.push = false;

Queue.prototype.canvasResized = function(canvas) {
    Queue.prototype.xInit = 5 * canvas.width / 6;
    Queue.prototype.xBoundary = 4 * canvas.width / 6;
};
Queue.prototype.update = function(elem) {
    var attr;
    for (var i = 0; i < this.attributes.length; ++i) {
        attr = this.attributes[i];
        this[attr] = elem[attr];
    }
};
Queue.prototype.remove = function(tree) {
    tree.del(this);
    Queue.prototype.yMax = this.yTop;
    for (var i in model.queues) {
        Queue.prototype.yMax =
            Math.max(Queue.prototype.yMax,
                     model.queues[i].pos[octtree.y] + this.yIncr);
    }
};
Queue.prototype.render = function(model, ctx) {
    if (this.disabled) {
        return;
    }
    ctx.beginPath();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    var text = this.name + " (" + this.messages_ready + ", "
            + this.messages_unacknowledged + ")";
    var dim = ctx.measureText(text);

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "black";
    ctx.moveTo(this.pos[octtree.x] - (dim.width / 2) - this.fontSize,
            this.pos[octtree.y] - this.fontSize);
    ctx.lineTo(this.pos[octtree.x] + (dim.width / 2) + this.fontSize,
            this.pos[octtree.y] - this.fontSize);
    ctx.lineTo(this.pos[octtree.x] + (dim.width / 2) + this.fontSize,
            this.pos[octtree.y] + this.fontSize);
    ctx.lineTo(this.pos[octtree.x] - (dim.width / 2) - this.fontSize,
            this.pos[octtree.y] + this.fontSize);
    ctx.closePath();

    this.preStroke(ctx);
    ctx.stroke();

    ctx.beginPath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(text, this.pos[octtree.x], this.pos[octtree.y]);

    this.xMin = this.pos[octtree.x] - (dim.width / 2) - this.fontSize;
    this.xMax = this.pos[octtree.x] + (dim.width / 2) + this.fontSize;

    Queue.prototype.yMax = Math.max(Queue.prototype.yMax,
                                    this.pos[octtree.y] + this.yIncr);
};
Queue.prototype.preStroke = function(ctx) {
};
Queue.prototype.animate = function(elapsed) {
    if (this.xBoundary < this.pos[octtree.x]) {
        this.ideal.pos[octtree.x] = this.xInit;
        this.ideal.pos[octtree.y] = this.pos[octtree.y];
        this.spring.apply(elapsed, this, this.ideal);
    }
};
Queue.prototype.disable = function(model) {
    model.queues_visible--;
};
Queue.prototype.enable = function(model) {
    model.queues_visible++;
};

var binding = {
    offset : 150,
    fontSize : 12,
    loopOffset : 50
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
    if (source.disabled || destination.disabled) {
        return;
    }
    var xMid = (source.xMax + destination.xMin) / 2;
    var xCtl1 = xMid > (source.xMax + binding.offset) ? xMid : source.xMax
            + binding.offset;
    var xCtl2 = xMid < (destination.xMin - binding.offset) ? xMid
            : destination.xMin - binding.offset;
    var yCtl1 = destination == source ? source.pos[octtree.y]
            - binding.loopOffset : source.pos[octtree.y];
    var yCtl2 = destination == source ? destination.pos[octtree.y]
            - binding.loopOffset : destination.pos[octtree.y];
    ctx.beginPath();
    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "black";
    ctx.moveTo(source.xMax, source.pos[octtree.y]);
    ctx.bezierCurveTo(xCtl1, yCtl1, xCtl2, yCtl2, destination.xMin,
            destination.pos[octtree.y]);
    binding.preStroke(source, destination, ctx);
    ctx.stroke();

    // draw an arrow head
    ctx.beginPath();
    ctx.moveTo(destination.xMin, destination.pos[octtree.y]);
    ctx.lineTo(destination.xMin - binding.fontSize, destination.pos[octtree.y]
            + (binding.fontSize / 2));
    ctx.lineTo(destination.xMin - binding.fontSize, destination.pos[octtree.y]
            - (binding.fontSize / 2));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();

    // draw the binding key
    ctx.beginPath();
    var yMid = source == destination ? source.pos[octtree.y]
            - binding.loopOffset + 12
            : (source.pos[octtree.y] + destination.pos[octtree.y]) / 2;
    var dim = ctx.measureText(elem.routing_key);

    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.67);"
    ctx.fillRect(xMid - dim.width/2, yMid - binding.fontSize/2,
                   dim.width, binding.fontSize);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(elem.routing_key, xMid, yMid);
};
binding.preStroke = function(source, destination, ctx) {
};
