var newton = {};
newton.friction = 100;

newton.update = function(elapsed, obj) {
    vec3.scale(obj.velocity, 1 - (newton.friction * elapsed));
    var incr = vec3.create(obj.velocity);
    vec3.scale(incr, elapsed);
    vec3.add(obj.pos, incr, obj.next_pos);
};

var spring = {};
spring.k = 1;
spring.equilibriumLength = 2;
spring.push = true;
spring.pull = true;
spring.dampingFactor = 0.5;
spring.octtreeRadius = 4;
spring.octtreeLimit = 40;

spring.update = function(elapsed, tree, obj) {
    var damper = spring.dampingFactor * elapsed * 100000;
    var vecOP = vec3.create();
    var distanceOP = 0;
    var x = 0;
    var found = tree.findInRadius(obj.pos, spring.octtreeRadius,
            spring.octtreeLimit);
    for ( var i = 0; i < found.length; ++i) {
        var obj1 = found[i].value;
        if (obj1 != obj) {
            // F = -k x where x is difference from equilibriumLength
            // a = F / m
            vec3.subtract(obj1.pos, obj.pos, vecOP);
            distanceOP = vec3.length(vecOP);
            if (!isNaN(distanceOP) && 0 != distanceOP) {
                x = distanceOP - spring.equilibriumLength;
                if (distanceOP > spring.equilibriumLength && !spring.pull) {
                    continue;
                }
                if (distanceOP < spring.equilibriumLength && !spring.push) {
                    continue;
                }
                vec3.scale(vecOP,
                        (damper * (((1 / distanceOP) * x) / obj.mass)));
                vec3.add(obj.velocity, vecOP);
            }
        }
    }
};

var gravity = {};
gravity.bigG = 1 / 20;
gravity.octtreeRadius = 5;
gravity.octtreeLimit = 20;
gravity.repel = false;

gravity.update = function(elapsed, tree, obj) {
    var vecOP = vec3.create();
    var distanceOP = 0;
    var found = tree.findInRadius(obj.pos, gravity.octtreeRadius,
            gravity.octtreeLimit);
    for ( var i = 0; i < found.length; ++i) {
        var obj1 = found[i].value;
        if (obj1 != obj) {
            // F = G.m1.m2 / (d.d)
            // a = F / m1
            // thus a = G.m2/(d.d)
            vec3.subtract(obj1.pos, obj.pos, vecOP);
            distanceOP = vec3.length(vecOP);
            if ((!(isNaN(distanceOP))) && 0 != distanceOP) {
                vec3.scale(vecOP, (gravity.bigG * obj1.mass)
                        / (distanceOP * distanceOP));
                if (gravity.repel) {
                    vec3.subtract(obj.velocity, vecOP);
                } else {
                    vec3.add(obj.velocity, vecOP);
                }
            }
        }
    }

};
