function octtree_root() {
	var n = Number.MAX_VALUE / 2;
	return new Octtree(-n, n, -n, n, -n, n);
};

function Octtree(xMin, xMax, yMin, yMax, zMin, zMax, parent) {
	this.xMin = xMin;
	this.xMax = xMax;
	this.yMin = yMin;
	this.yMax = yMax;
	this.zMin = zMin;
	this.zMax = zMax;
	this.parent = parent;

	this.xMid = xMin + (xMax - xMin) / 2;
	this.yMid = yMin + (yMax - yMin) / 2;
	this.zMid = zMin + (zMax - zMin) / 2;

	this.is_empty = is_empty;
	this.has_value = has_value;
	this.add = add;
	this.del = del;
	this.find = find;
	this.find4 = find4;
	this.update = update;
	this.size = size;
};

function find(pos, radius, acc) {
	this.find4(pos, radius, radius * radius, acc);
};

function find4(pos, radius, radiusSq, acc) {
	var worklist = new Array(this);
	var tree = undefined;

	var x_p_r = 0;
	var x_m_r = 0;
	var y_p_r = 0;
	var y_m_r = 0;
	var z_p_r = 0;
	var z_m_r = 0;

	while (0 < worklist.length) {
		tree = worklist.shift();

		if (tree.is_empty()) {
			continue;
		}

		if (tree.has_value()) {
			var xd = Math.abs(tree.value.pos[0] - pos[0]);
			var yd = Math.abs(tree.value.pos[1] - pos[1]);
			var zd = Math.abs(tree.value.pos[2] - pos[2]);
			xd *= xd;
			yd *= yd;
			zd *= zd;
			if ((xd + yd + zd) <= radiusSq) {
				acc.push(tree);
			}
			continue;
		}

		x_p_r = pos[0] + radius;
		x_m_r = pos[0] - radius;
		y_p_r = pos[1] + radius;
		y_m_r = pos[1] - radius;
		z_p_r = pos[2] + radius;
		z_m_r = pos[2] - radius;

		if (x_p_r < tree.xMin || tree.xMax <= x_m_r || y_p_r < tree.yMin
				|| tree.yMax <= y_m_r || z_p_r < tree.zMin
				|| tree.zMax <= z_m_r) {
			continue;
		}

		if (x_m_r < tree.xMid) {
			if (y_m_r < tree.yMid) {
				if (z_m_r < tree.zMid) {
					worklist.push(tree.bot_sw);
				}
				if (tree.zMid <= z_p_r) {
					worklist.push(tree.bot_nw);
				}
			}
			if (tree.yMid <= y_p_r) {
				if (z_m_r < tree.zMid) {
					worklist.push(tree.top_sw);
				}
				if (tree.zMid <= z_p_r) {
					worklist.push(tree.top_nw);
				}
			}
		}
		if (tree.xMid <= x_p_r) {
			if (y_m_r < tree.yMid) {
				if (z_m_r < tree.zMid) {
					worklist.push(tree.bot_se);
				}
				if (tree.zMid <= z_p_r) {
					worklist.push(tree.bot_ne);
				}
			}
			if (tree.yMid <= y_p_r) {
				if (z_m_r < tree.zMid) {
					worklist.push(tree.top_se);
				}
				if (tree.zMid <= z_p_r) {
					worklist.push(tree.top_ne);
				}
			}
		}
	}
};

function add(e) {
	var worklist = new Array();
	var v = e;
	var tree = this;

	while ((!(tree == undefined)) || worklist.length > 0) {
		if (tree == undefined) {
			v = worklist.shift();
			tree = worklist.shift();
		}

		if (v.pos[0] < tree.xMin || tree.xMax <= v.pos[0]
				|| v.pos[1] < tree.yMin || tree.yMax <= v.pos[1]
				|| v.pos[2] < tree.zMin || tree.zMax <= v.pos[2]) {
			// if the value is outside the root, then it'll just get silently
			// ignored. This is "safe".
			tree = tree.parent;
			continue;
		}

		if (tree.is_empty()
				|| (tree.has_value() && v.pos[0] == tree.value.pos[0]
						&& v.pos[1] == tree.value.pos[1] && v.pos[2] == tree.value.pos[2])) {
			tree.value = v;
			tree = undefined;
			continue;
		}

		if (tree.has_value()) {
			tree.top_nw = new Octtree(tree.xMin, tree.xMid, tree.yMid,
					tree.yMax, tree.zMid, tree.zMax, tree);
			tree.top_ne = new Octtree(tree.xMid, tree.xMax, tree.yMid,
					tree.yMax, tree.zMid, tree.zMax, tree);
			tree.top_se = new Octtree(tree.xMid, tree.xMax, tree.yMid,
					tree.yMax, tree.zMin, tree.zMid, tree);
			tree.top_sw = new Octtree(tree.xMin, tree.xMid, tree.yMid,
					tree.yMax, tree.zMin, tree.zMid, tree);

			tree.bot_nw = new Octtree(tree.xMin, tree.xMid, tree.yMin,
					tree.yMid, tree.zMid, tree.zMax, tree);
			tree.bot_ne = new Octtree(tree.xMid, tree.xMax, tree.yMin,
					tree.yMid, tree.zMid, tree.zMax, tree);
			tree.bot_se = new Octtree(tree.xMid, tree.xMax, tree.yMin,
					tree.yMid, tree.zMin, tree.zMid, tree);
			tree.bot_sw = new Octtree(tree.xMin, tree.xMid, tree.yMin,
					tree.yMid, tree.zMin, tree.zMid, tree);

			worklist.push(tree.value);
			worklist.push(tree);
			tree.value = undefined;
		}

		if (v.pos[0] < tree.xMid) {
			if (v.pos[1] < tree.yMid) {
				if (v.pos[2] < tree.zMid) {
					tree = tree.bot_sw;
				} else {
					tree = tree.bot_nw;
				}
			} else {
				if (v.pos[2] < tree.zMid) {
					tree = tree.top_sw;
				} else {
					tree = tree.top_nw;
				}
			}
		} else {
			if (v.pos[1] < tree.yMid) {
				if (v.pos[2] < tree.zMid) {
					tree = tree.bot_se;
				} else {
					tree = tree.bot_ne;
				}
			} else {
				if (v.pos[2] < tree.zMid) {
					tree = tree.top_se;
				} else {
					tree = tree.top_ne;
				}
			}
		}
	}
};

function del(e) {
	var v = e;
	var tree = this;

	while (!(undefined == tree)) {
		if (tree.has_value()) {
			if (v.pos[0] == tree.value.pos[0] && v.pos[1] == tree.value.pos[1]
					&& v.pos[2] == tree.value.pos[2]) {
				tree.value = undefined;
			}
			break;
		} else if (tree.is_empty()) {
			break;
		} else {
			if (v.pos[0] < tree.xMin || tree.xMax <= v.pos[0]
					|| v.pos[1] < tree.yMin || tree.yMax <= v.pos[1]
					|| v.pos[2] < tree.zMin || tree.zMax <= v.pos[2]) {
				tree = tree.parent;
			} else {
				if (v.pos[0] < tree.xMid) {
					if (v.pos[1] < tree.yMid) {
						if (v.pos[2] < tree.zMid) {
							tree = tree.bot_sw;
						} else {
							tree = tree.bot_nw;
						}
					} else {
						if (v.pos[2] < tree.zMid) {
							tree = tree.top_sw;
						} else {
							tree = tree.top_nw;
						}
					}
				} else {
					if (v.pos[1] < tree.yMid) {
						if (v.pos[2] < tree.zMid) {
							tree = tree.bot_se;
						} else {
							tree = tree.bot_ne;
						}
					} else {
						if (v.pos[2] < tree.zMid) {
							tree = tree.top_se;
						} else {
							tree = tree.top_ne;
						}
					}
				}
			}
		}
	}
};

function has_value() {
	return (!(this.value == undefined));
};

function is_empty() {
	return (this.value == undefined && this.top_nw == undefined);
};

function update() {
	var tree = this;
	var worklist = new Array();
	var v = undefined;
	var pruneable = new Array();

	while (!(undefined == tree)) {
		if (tree.has_value()) {
			v = tree.value;
			if (v.next_pos[0] < tree.xMin || tree.xMax <= v.next_pos[0]
					|| v.next_pos[1] < tree.yMin || tree.yMax <= v.next_pos[1]
					|| v.next_pos[2] < tree.zMin || tree.zMax <= v.next_pos[2]) {
				tree.del(v);
				vec3.set(v.next_pos, v.pos);
				this.add(v);
				if (!(undefined == tree.parent)) {
					pruneable.push(tree.parent);
				}
			} else {
				vec3.set(v.next_pos, v.pos);
			}
		} else if (!tree.is_empty()) {
			worklist.push(tree.top_nw);
			worklist.push(tree.top_ne);
			worklist.push(tree.top_sw);
			worklist.push(tree.top_se);
			worklist.push(tree.bot_nw);
			worklist.push(tree.bot_ne);
			worklist.push(tree.bot_sw);
			worklist.push(tree.bot_se);
		}
		tree = worklist.shift();
	}
	prune(pruneable);
};

function size() {
	var count = 0;
	var tree = this;
	var worklist = new Array();
	while (!(undefined == tree)) {
		if (tree.has_value()) {
			count++;
		} else if (!tree.is_empty()) {
			worklist.push(tree.top_nw);
			worklist.push(tree.top_ne);
			worklist.push(tree.top_sw);
			worklist.push(tree.top_se);
			worklist.push(tree.bot_nw);
			worklist.push(tree.bot_ne);
			worklist.push(tree.bot_sw);
			worklist.push(tree.bot_se);
		}
		tree = worklist.shift();
	}
	return count;
}

function prune(worklist) {
	var tree = worklist.shift();
	while (!(undefined == tree)) {
		if (tree.has_value()) {

		} else if (!tree.is_empty()) {
			if (tree.top_sw.is_empty() && tree.top_se.is_empty()
					&& tree.top_nw.is_empty() && tree.top_ne.is_empty()
					&& tree.bot_sw.is_empty() && tree.bot_se.is_empty()
					&& tree.bot_nw.is_empty() && tree.bot_ne.is_empty()) {
				tree.top_sw = undefined;
				tree.top_se = undefined;
				tree.top_nw = undefined;
				tree.top_ne = undefined;
				tree.bot_sw = undefined;
				tree.bot_se = undefined;
				tree.bot_nw = undefined;
				tree.bot_ne = undefined;
				worklist.push(tree.parent);
			} else {
				if (!tree.top_sw.is_empty()) {
					worklist.push(tree.top_sw);
				}
				if (!tree.top_se.is_empty()) {
					worklist.push(tree.top_se);
				}
				if (!tree.top_nw.is_empty()) {
					worklist.push(tree.top_nw);
				}
				if (!tree.top_ne.is_empty()) {
					worklist.push(tree.top_ne);
				}
				if (!tree.bot_sw.is_empty()) {
					worklist.push(tree.bot_sw);
				}
				if (!tree.bot_se.is_empty()) {
					worklist.push(tree.bot_se);
				}
				if (!tree.bot_nw.is_empty()) {
					worklist.push(tree.bot_nw);
				}
				if (!tree.bot_ne.is_empty()) {
					worklist.push(tree.bot_ne);
				}
			}
		}
		tree = worklist.shift();
	}
}