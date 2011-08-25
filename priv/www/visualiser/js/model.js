function Model() {
    this.exchange = {};
    this.exchanges_visible = 0;
    this.queue = {};
    this.queues_visible = 0;
    this.channel = {};
    this.channels_visible = 0;
    this.connection = {};
    this.vhost = {};
    this.rendering = { exchange   : { enabled   : true,
                                      on_enable : {} },
                       queue      : { enabled   : true,
                                      on_enable : {} },
                       channel    : { enabled   : true,
                                      on_enable : {} },
                       connection : { enabled   : true,
                                      on_enable : {} }
                     };
};

Model.prototype.permitted_exchanges_visible = 10;
Model.prototype.permitted_queues_visible = 10;
Model.prototype.permitted_channels_visible = 10;

Model.prototype.rebuild = function(tree, configuration) {
    var elem;
    var matched = {};

    // Channels
    for (var i = 0; i < configuration.channels.length; ++i) {
        elem = configuration.channels[i];
        if (undefined == this.channel[elem.name]) {
            this.channel[elem.name] = new Channel(tree, elem, this);
            this.channels_visible++;
            if ((this.channels_visible >
                 this.permitted_channels_visible) ||
                 ! this.rendering.channel.enabled) {
                this.disable(this.channel[elem.name], tree);
            }
        } else {
            this.channel[elem.name].update(elem);
        }
        matched[elem.name] = true;
    }
    for (var i in this.channel) {
        if (undefined == matched[i]) {
            elem = this.channel[i];
            delete this.channel[i];
            elem.remove(tree, this);
            if (! elem.disabled) {
                this.channels_visible--;
            }
        }
    }

    // Exchanges
    for (var i = 0; i < configuration.exchanges.length; ++i) {
        elem = configuration.exchanges[i];
        if (undefined == this.exchange[elem.name]) {
            this.exchange[elem.name] = new Exchange(tree, elem, this);
            this.exchanges_visible++;
            if (elem.name.slice(0,4) == "amq." ||
                (this.exchanges_visible >
                 this.permitted_exchanges_visible) ||
                 ! this.rendering.exchange.enabled) {
                this.disable(this.exchange[elem.name], tree);
            }
        } else {
            this.exchange[elem.name].update(elem);
        }
        matched[elem.name] = true;
    }
    for (var i in this.exchange) {
        if (undefined == matched[i]) {
            elem = this.exchange[i];
            delete this.exchange[i];
            elem.remove(tree, this);
            if (! elem.disabled) {
                this.exchanges_visible--;
            }
        }
    }

    // Queues
    matched = {};
    for (var i = 0; i < configuration.queues.length; ++i) {
        elem = configuration.queues[i];
        if (undefined == this.queue[elem.name]) {
            this.queue[elem.name] = new Queue(tree, elem, this);
            this.queues_visible++;
            if ((this.queues_visible >
                 this.permitted_queues_visible) ||
                 ! this.rendering.queue.enabled) {
                this.disable(this.queue[elem.name], tree);
                delete this.rendering.queue.on_enable[elem.name];
            }
        } else {
            this.queue[elem.name].update(elem);
        }
        matched[elem.name] = true;
    }
    for (var i in this.queue) {
        if (undefined == matched[i]) {
            elem = this.queue[i];
            delete this.queue[i];
            elem.remove(tree, this);
            if (! elem.disabled) {
                this.queues_visible--;
            }
        }
    }

    // Bindings
    var binding;
    var bindings = {};
    for (var i = 0; i < configuration.bindings.length; ++i) {
        elem = configuration.bindings[i];
        if (undefined == this.exchange[elem.source] ||
            undefined == this[elem.destination_type][elem.destination]) {
            continue;
        }
        if (undefined == bindings[elem.source]) {
            bindings[elem.source] = { exchange : {}, queue : {} };
        }
        var source = bindings[elem.source];
        if (undefined == source[elem.destination_type][elem.destination]) {
            source[elem.destination_type][elem.destination] = new Array(elem);
        } else {
            source[elem.destination_type][elem.destination].push(elem);
        }
    }

    for (var source in bindings) {
        var src = this.exchange[source].bindings_outbound;
        var i = bindings[source];
        for (var destination_type in i) {
            var j = i[destination_type];
            var src1 = src[destination_type];
            for (var destination in j) {
                var dest = this[destination_type][destination].bindings_inbound;
                if (undefined == src1[destination]) {
                    src1[destination] = new Binding(j[destination]);
                } else {
                    src1[destination].set(j[destination]);
                }
                binding = src1[destination];
                if (undefined == dest[source]) {
                    dest[source] = binding;
                }
            }
        }
    }
    for (var src in this.exchange) {
        for (var dest_type in this.exchange[src].bindings_outbound) {
            for (var dest in this.exchange[src].bindings_outbound[dest_type]) {
                binding = this.exchange[src].bindings_outbound[dest_type][dest];
                if (undefined == bindings[binding.source] ||
                    undefined == bindings[binding.source][binding.destination_type] ||
                    undefined == bindings[binding.source][binding.destination_type][binding.destination]) {
                    delete this.exchange[src].bindings_outbound[dest_type][dest];
                    if (undefined != this[binding.destination_type][binding.destination]) {
                        delete this[binding.destination_type][binding.destination].bindings_inbound[binding.source];
                    }
                }
            }
        }
    }
    bindings = undefined;

    // vhosts
    matched = {};
    for (var i = 0; i < configuration.vhosts.length; ++i) {
        elem = configuration.vhosts[i];
        if (undefined == this.vhost[elem.name]) {
            this.vhost[elem.name] = elem;
            this.vhost_add(elem);
        }
        matched[elem.name] = true;
    }
    for (var i in this.vhost) {
        if (undefined == matched[i]) {
            this.vhost_remove(this.vhost[i]);
            delete this.vhost[i];
        }
    }

    matched = undefined;
};
Model.prototype.disable = function(elem, tree) {
    elem.disable(this);
    tree.del(elem);
    elem.disabled = true;
    elem.details = undefined;
};
Model.prototype.enable = function(elem, tree) {
    elem.enable(this);
    tree.add(elem);
    elem.disabled = false;
    elem.details = undefined;
};
Model.prototype.render = function(ctx) {
    if (model.rendering.exchange.enabled) {
        for (var i in this.exchange) {
            model.exchange[i].render(this, ctx);
        }
    }
    if (model.rendering.queue.enabled) {
        for (var i in this.queue) {
            model.queue[i].render(this, ctx);
        }
    }
    if (model.rendering.channel.enabled) {
        for (var i in this.channel) {
            model.channel[i].render(this, ctx);
        }
    }
};
Model.prototype.cull = function (xMin, yMin, width, height) {
    return false;
};
Model.prototype.vhost_add = function (elem) {
};
Model.prototype.vhost_del = function (elem) {
};

function Channel(tree, elem, model) {
    this.name = elem.name;
    this.pos = vec3.create();
    this.pos[octtree.x] = this.xInit;
    this.pos[octtree.y] = this.yInit;
    this.pos[octtree.z] = 0;

    maxX(this, model.channel);

    this.yMin = this.pos[octtree.y];
    this.yMax = this.pos[octtree.y];

    this.next_pos = vec3.create(this.pos);
    this.mass = 0.1;
    this.velocity = vec3.create();
    this.ideal = { pos : vec3.create() };
    this.disabled = false;
    this.update(elem);
    tree.add(this);
};

Channel.prototype = {
    yInit : 100,
    yIncr : 50,
    xInit : 100,
    xIncr : 50,
    xMax : 200,
    yBoundary : 200,
    attributes : ['acks_uncommitted', 'client_flow_blocked', 'confirm', 'connection_details',
                  'consumer_count', 'message_stats', 'messages_unacknowledged',
                  'messages_unconfirmed', 'node', 'number', 'prefetch_count', 'transactional',
                  'user', 'vhost'],
    pos : vec3.create(),
    fontSize : 12,
    spring : new Spring(),
    details : undefined,
    type : 'channel'
};
Channel.prototype.spring.octtreeLimit = 10;
Channel.prototype.spring.octtreeRadius = 500;
Channel.prototype.spring.equilibriumLength = 0;
Channel.prototype.spring.dampingFactor = 0.1;
Channel.prototype.spring.pull = true;
Channel.prototype.spring.push = false;

Channel.prototype.canvasResized = function(canvas) {
    Channel.prototype.xMax = canvas.width - Channel.prototype.xInit;
};
Channel.prototype.update = function(elem) {
    var attr;
    for (var i = 0; i < this.attributes.length; ++i) {
        attr = this.attributes[i];
        this[attr] = elem[attr];
    }
};
Channel.prototype.remove = function(tree, model) {
    tree.del(this);
};
Channel.prototype.render = function(model, ctx) {
    if (this.disabled) {
        return;
    }
    var dim = ctx.measureText(this.name);
    if (model.cull(this.pos[octtree.x] - this.fontSize,
                   this.pos[octtree.y] - (dim.width/2) - this.fontSize,
                   this.fontSize * 2,
                   dim.width + (this.fontSize * 2))) {
        return;
    }

    this.yMax = this.pos[octtree.y] + (dim.width/2) + this.fontSize;
    this.yMin = this.pos[octtree.y] - (dim.width/2) - this.fontSize;

    ctx.beginPath();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.lineWidth = 2.0;
    ctx.strokeStyle = "black";
    ctx.moveTo(this.pos[octtree.x] - this.fontSize, this.yMin);
    ctx.lineTo(this.pos[octtree.x] + this.fontSize, this.yMin);
    ctx.lineTo(this.pos[octtree.x] + this.fontSize, this.yMax);
    ctx.lineTo(this.pos[octtree.x] - this.fontSize, this.yMax);
    ctx.closePath();
    this.preStroke(ctx);

    ctx.save();
    ctx.translate(this.pos[octtree.x], this.pos[octtree.y]);
    ctx.rotate(3*Math.PI/2);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(this.name, 0, 0);
    ctx.restore();

    if (undefined != this.details) {
        var needArrow = false;
        ctx.lineWidth = 2.0;
        if (undefined != this.details.consumer_details) {
            ctx.strokeStyle = "#00a000";
            for (var i = 0; i < this.details.consumer_details.length; ++i) {
                var consumer = this.details.consumer_details[i];
                var queue = consumer.queue_details.name;
                if (undefined != model.queue[queue] && ! model.queue[queue].disabled) {
                    needArrow = true;
                    Consumer.render(this, model.queue[queue], ctx, consumer.consumer_tag);
                }
            }
            if (needArrow) {
                ctx.beginPath();
                ctx.moveTo(this.pos[octtree.x], this.yMax);
                ctx.lineTo(this.pos[octtree.x] - (this.fontSize/2), this.yMax + this.fontSize);
                ctx.lineTo(this.pos[octtree.x] + (this.fontSize/2), this.yMax + this.fontSize);
                ctx.closePath();
                ctx.fillStyle = ctx.strokeStyle;
                ctx.fill();
            }
        }

        if (undefined != this.details.publishes) {
            ctx.strokeStyle = "#0000a0";
            for (var i = 0; i < this.details.publishes.length; ++i) {
                var publisher = this.details.publishes[i];
                var exchange = publisher.exchange.name;
                if (undefined != model.exchange[exchange] && ! model.exchange[exchange].disabled) {
                    Publisher.render(this, model.exchange[exchange], ctx);
                }
            }
        }
    }
};
Channel.prototype.preStroke = function(ctx) {
};
Channel.prototype.animate = function(elapsed) {
    if (this.yBoundary > this.pos[octtree.y]) {
        this.ideal.pos[octtree.x] = this.pos[octtree.x];
        this.ideal.pos[octtree.y] = this.yInit;
        this.spring.apply(elapsed, this, this.ideal);
    }
};
Channel.prototype.disable = function(model) {
    model.channels_visible--;
};
Channel.prototype.enable = function(model) {
    model.channels_visible++;
    maxX(this, model.channel);
    this.pos[octtree.y] = this.yInit;
    if (this.pos[octtree.x] >= this.xMax) {
        this.pos[octtree.x] = this.xMax;
        maxY(this, model.channel);
        this.pos[octtree.y] += this.xIncr;
    }
};
Channel.prototype.getDetails = function() {
};

function Exchange(tree, elem, model) {
    this.name = elem.name;
    this.pos = vec3.create();
    this.pos[octtree.x] = this.xInit;
    this.pos[octtree.y] = this.yInit;
    this.pos[octtree.z] = 0;

    maxY(this, model.exchange);

    this.next_pos = vec3.create(this.pos);
    this.xMin = this.pos[octtree.x];
    this.xMax = this.pos[octtree.x];
    this.mass = 0.1;
    this.velocity = vec3.create();
    this.ideal = { pos : vec3.create() };
    this.disabled = false;
    this.bindings_outbound = { exchange : {}, queue : {} };
    this.bindings_inbound = {};
    this.update(elem);
    tree.add(this);
};

Exchange.prototype = {
    yInit : 250,
    yIncr : 50,
    xInit : 100,
    xBoundary : 200,
    attributes : [ 'arguments', 'auto_delete', 'durable', 'internal', 'type',
                   'message_stats_out', 'message_stats_in', 'vhost' ],
    pos : vec3.create(),
    fontSize : 12,
    spring : new Spring(),
    details : undefined,
    type : 'exchange'
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
    for (var i = 0; i < this.attributes.length; ++i) {
        attr = this.attributes[i];
        this[attr] = elem[attr];
    }
};
Exchange.prototype.remove = function(tree, model) {
    tree.del(this);
};
Exchange.prototype.render = function(model, ctx) {
    if (this.disabled) {
        return;
    }
    for (var i in this.bindings_outbound.exchange) {
        this.bindings_outbound.exchange[i].render(model, ctx);
    }
    if (model.rendering.queue.enabled) {
        for (var i in this.bindings_outbound.queue) {
            this.bindings_outbound.queue[i].render(model, ctx);
        }
    }
    var dim = ctx.measureText(this.name);
    if (model.cull(this.pos[octtree.x] - (dim.width / 2) - this.fontSize,
                   this.pos[octtree.y] - this.fontSize,
                   dim.width + (2*this.fontSize),
                   2*this.fontSize)) {
        return;
    }

    ctx.beginPath();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

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

    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(this.name, this.pos[octtree.x], this.pos[octtree.y]);

    this.xMin = this.pos[octtree.x] - (dim.width / 2) - this.fontSize;
    this.xMax = this.pos[octtree.x] + (dim.width / 2) + this.fontSize;
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
    this.pos[octtree.x] = this.xInit;
    maxY(this, model.exchange);
};
Exchange.prototype.getDetails = function() {
};

function Queue(tree, elem, model) {
    this.name = elem.name;
    this.pos = vec3.create();
    this.pos[octtree.x] = this.xInit;
    this.pos[octtree.y] = this.yInit;
    this.pos[octtree.z] = 0;

    maxY(this, model.queue);

    this.next_pos = vec3.create(this.pos);
    this.xMin = this.pos[octtree.x];
    this.xMax = this.pos[octtree.x];
    this.mass = 0.1;
    this.velocity = vec3.create();
    this.ideal = { pos : vec3.create() };
    this.disabled = false;
    this.bindings_inbound = {};
    this.update(elem);
    tree.add(this);
}

Queue.prototype = {
    yInit : 250,
    yIncr : 50,
    xInit : 400,
    xBoundary : 300,
    attributes : [ 'arguments', 'auto_delete', 'durable', 'messages',
                   'messages_ready', 'messages_unacknowledged', 'message_stats',
                   'node', 'owner_pid_details', 'vhost' ],
    pos : vec3.create(),
    fontSize : 12,
    spring : new Spring(),
    details : undefined,
    type : 'queue'
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
Queue.prototype.remove = function(tree, model) {
    tree.del(this);
};
Queue.prototype.render = function(model, ctx) {
    if (this.disabled) {
        return;
    }
    var text = this.name + " (" + this.messages_ready + ", "
            + this.messages_unacknowledged + ")";
    var dim = ctx.measureText(text);
    if (model.cull(this.pos[octtree.x] - (dim.width / 2) - this.fontSize,
                   this.pos[octtree.y] - this.fontSize,
                   dim.width + (2*this.fontSize),
                   2*this.fontSize)) {
        return;
    }
    ctx.beginPath();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

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

    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(text, this.pos[octtree.x], this.pos[octtree.y]);

    this.xMin = this.pos[octtree.x] - (dim.width / 2) - this.fontSize;
    this.xMax = this.pos[octtree.x] + (dim.width / 2) + this.fontSize;
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
    this.pos[octtree.x] = this.xInit;
    maxY(this, model.queue);
};
Queue.prototype.getDetails = function() {
};

function Binding(elems) {
    this.keys = {};
    this.set(elems);
    var elem = elems.shift();
    this.source = elem.source;
    this.destination_type = elem.destination_type;
    this.destination = elem.destination;
};
Binding.prototype = {
    attributes : [ 'arguments' ],
    offset : 150,
    fontSize : 12,
    loopOffset : 50,
    type : 'binding'
};
Binding.prototype.set = function(elems) {
    this.keys = {};
    for (var i = 0; i < elems.length; ++i) {
        var elem = elems[i];
        this.keys[elem.routing_key] = {};
        var attr;
        for (var j = 0; j < this.attributes.length; ++j) {
            attr = this.attributes[j];
            this.keys[elem.routing_key][attr] = elem[attr];
        }
    }
};
Binding.prototype.render = function(model, ctx) {
    var source = model.exchange[this.source];
    var destination;
    if (this.destination_type == "exchange") {
        destination = model.exchange[this.destination];
    } else {
        destination = model.queue[this.destination];
    }
    if (undefined == source || undefined == destination) {
        return;
    }
    if (source.disabled || destination.disabled) {
        return;
    }
    var xMid = (source.xMax + destination.xMin) / 2;
    var xCtl1 = xMid > (source.xMax + this.offset) ? xMid : source.xMax
            + this.offset;
    var xCtl2 = xMid < (destination.xMin - this.offset) ? xMid
            : destination.xMin - this.offset;
    var yCtl1 = destination == source ? source.pos[octtree.y]
            - this.loopOffset : source.pos[octtree.y];
    var yCtl2 = destination == source ? destination.pos[octtree.y]
            - this.loopOffset : destination.pos[octtree.y];
    var xMin = Math.min(source.xMax, xCtl2);
    var yMin = Math.min(yCtl1, yCtl2);
    var xMax = Math.max(destination.xMin, xCtl1);
    var yMax = Math.max(source.pos[octtree.y], destination.pos[octtree.y]);
    if (model.cull(xMin, yMin, xMax - xMin, yMax - yMin)) {
        return;
    }

    ctx.beginPath();
    ctx.lineWidth = 1.0;
    ctx.strokeStyle = "black";
    ctx.moveTo(source.xMax, source.pos[octtree.y]);
    ctx.bezierCurveTo(xCtl1, yCtl1, xCtl2, yCtl2, destination.xMin,
            destination.pos[octtree.y]);
    ctx.moveTo(destination.xMin, destination.pos[octtree.y]+1);
    ctx.bezierCurveTo(xCtl2, yCtl2+1, xCtl1, yCtl1+1, source.xMax,
            source.pos[octtree.y]+1);
    ctx.moveTo(source.xMax, source.pos[octtree.y]);
    ctx.closePath();
    this.preStroke(source, destination, ctx);

    // draw an arrow head
    ctx.beginPath();
    ctx.moveTo(destination.xMin, destination.pos[octtree.y]);
    ctx.lineTo(destination.xMin - this.fontSize, destination.pos[octtree.y]
            + (this.fontSize / 2));
    ctx.lineTo(destination.xMin - this.fontSize, destination.pos[octtree.y]
            - (this.fontSize / 2));
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();
};
Binding.prototype.preStroke = function(source, destination, ctx) {
};

var Consumer = {};
Consumer.render = function(channel, queue, ctx, consumerTag) {
    ctx.beginPath();
    var yMid = (channel.yMax + queue.pos[octtree.y])/2;
    var xCtl = queue.pos[octtree.x];
    ctx.moveTo(channel.pos[octtree.x], channel.yMax);
    ctx.bezierCurveTo(channel.pos[octtree.x], yMid,
                      xCtl, queue.pos[octtree.y] - channel.yInit,
                      xCtl, queue.pos[octtree.y] - queue.fontSize);
    ctx.moveTo(channel.pos[octtree.x], channel.yMax);
    ctx.closePath();
    ctx.stroke();

    var dim = ctx.measureText(consumerTag);
    var mid = bezierMid(channel.pos[octtree.x], channel.yMax,
                        channel.pos[octtree.x], yMid,
                        xCtl, queue.pos[octtree.y] - channel.yInit,
                        xCtl, queue.pos[octtree.y] - queue.fontSize);
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255, 255, 255, 0.67)";
    ctx.fillRect(mid[0] - dim.width/2, mid[1] - channel.fontSize/2, dim.width, channel.fontSize);
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fillText(consumerTag, mid[0], mid[1]);
};

var Publisher = {};
Publisher.render = function(channel, exchange, ctx) {
    ctx.beginPath();
    var yMid = (channel.yMax + exchange.pos[octtree.y])/2;
    var xCtl = exchange.pos[octtree.x];
    ctx.moveTo(channel.pos[octtree.x], channel.yMax);
    ctx.bezierCurveTo(channel.pos[octtree.x], yMid,
                      xCtl, exchange.pos[octtree.y] - channel.yInit,
                      xCtl, exchange.pos[octtree.y] - exchange.fontSize);
    ctx.moveTo(channel.pos[octtree.x], channel.yMax);
    ctx.closePath();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(exchange.pos[octtree.x],
               exchange.pos[octtree.y] - exchange.fontSize);
    ctx.lineTo(exchange.pos[octtree.x] - exchange.fontSize / 2,
               exchange.pos[octtree.y] - 2 * exchange.fontSize);
    ctx.lineTo(exchange.pos[octtree.x] + exchange.fontSize / 2,
               exchange.pos[octtree.y] - 2 * exchange.fontSize);
    ctx.closePath();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.fill();

};

function maxY(elem, subModel) {
    elem.pos[octtree.y] = elem.yInit;
    for (var i in subModel) {
        if (subModel[i] != elem && ! subModel[i].disabled) {
            elem.pos[octtree.y] =
                Math.max(elem.pos[octtree.y],
                         subModel[i].pos[octtree.y] + elem.yIncr);
        }
    }
};

function maxX(elem, subModel) {
    elem.pos[octtree.x] = elem.xInit;
    for (var i in subModel) {
        if (subModel[i] != elem && ! subModel[i].disabled) {
            elem.pos[octtree.x] =
                Math.max(elem.pos[octtree.x],
                         subModel[i].pos[octtree.x] + elem.xIncr);
        }
    }
};

function bezierMid(startX, startY, ctl1X, ctl1Y, ctl2X, ctl2Y, endX, endY) {
    var start_ctl1X = (startX + ctl1X) /2;
    var start_ctl1Y = (startY + ctl1Y) /2;

    var end_ctl2X = (endX + ctl2X) /2;
    var end_ctl2Y = (endY + ctl2Y) /2;

    var ctl1_ctl2X = (ctl1X + ctl2X) /2;
    var ctl1_ctl2Y = (ctl1Y + ctl2Y) /2;

    var mid1X = (start_ctl1X + ctl1_ctl2X) /2;
    var mid1Y = (start_ctl1Y + ctl1_ctl2Y) /2;

    var mid2X = (end_ctl2X + ctl1_ctl2X) /2;
    var mid2Y = (end_ctl2Y + ctl1_ctl2Y) /2;

    return [(mid1X + mid2X)/2, (mid1Y + mid2Y)/2];
};
