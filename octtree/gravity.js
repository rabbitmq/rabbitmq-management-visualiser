var gravity = {};
gravity.bigG = 1 / 20;
gravity.octtreeRadius = 5;
gravity.octtreeLimit = 20;
gravity.friction = 100;

gravity.update = function(elapsed, tree, obj) {
	var vecOP = vec3.create();
	var distanceOP = 0;
	vec3.scale(obj.velocity, 1 - (gravity.friction * elapsed));
	var incr = vec3.create(obj.velocity);
	vec3.scale(incr, elapsed);
	vec3.add(obj.pos, incr, obj.next_pos);
	var found = tree.findInRadius(obj.pos, gravity.octtreeRadius,
			gravity.octtreeLimit);
	for ( var i = 0; i < found.length; ++i) {
		var obj1 = found[i].value;
		if (obj1 != obj) {
			vec3.subtract(obj1.pos, obj.pos, vecOP);
			distanceOP = vec3.length(vecOP);
			if ((!(isNaN(distanceOP))) && 0 != distanceOP) {
				vec3.scale(vecOP, (gravity.bigG * obj1.mass)
						/ (distanceOP * distanceOP));
				vec3.add(obj.velocity, vecOP);
			}
		}
	}

};