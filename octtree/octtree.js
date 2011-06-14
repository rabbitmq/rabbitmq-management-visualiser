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
			var xd = Math.abs(tree.value.x - pos.x);
			var yd = Math.abs(tree.value.y - pos.y);
			var zd = Math.abs(tree.value.z - pos.z);
			xd *= xd;
			yd *= yd;
			zd *= zd;
			if ((xd + yd + zd) <= radiusSq) {
				acc.push(tree);
			}
			continue;
		}

		x_p_r = pos.x + radius;
		x_m_r = pos.x - radius;
		y_p_r = pos.y + radius;
		y_m_r = pos.y - radius;
		z_p_r = pos.z + radius;
		z_m_r = pos.z - radius;

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

		if (v.x < tree.xMin || tree.xMax <= v.x || v.y < tree.yMin
				|| tree.yMax <= v.y || v.z < tree.zMin || tree.zMax <= v.z) {
			// if the value is outside the root, then it'll just get silently
			// ignored. This is "safe".
			tree = tree.parent;
			continue;
		}

		if (tree.is_empty()
				|| (tree.has_value() && v.x == tree.value.x
						&& v.y == tree.value.y && v.z == tree.value.z)) {
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

		if (v.x < tree.xMid) {
			if (v.y < tree.yMid) {
				if (v.z < tree.zMid) {
					tree = tree.bot_sw;
				} else {
					tree = tree.bot_nw;
				}
			} else {
				if (v.z < tree.zMid) {
					tree = tree.top_sw;
				} else {
					tree = tree.top_nw;
				}
			}
		} else {
			if (v.y < tree.yMid) {
				if (v.z < tree.zMid) {
					tree = tree.bot_se;
				} else {
					tree = tree.bot_ne;
				}
			} else {
				if (v.z < tree.zMid) {
					tree = tree.top_se;
				} else {
					tree = tree.top_ne;
				}
			}
		}
	}
};

function del(e) {
	return del_inner(this, [ e ]);
};

function del_inner(tree, worklist) {
	for ( var c = 0; c < worklist.length; ++c) {
		tree1 = del_inner1(tree, worklist);
		if (!(undefined == tree1)) {
			tree = tree1;
		}
	}
	return tree;
};

function del_inner1(tree, v) {
	var changed = false;

	while (!(undefined == tree)) {
		if (tree.has_value()) {
			if (v.x == tree.value.x && v.y == tree.value.y
					&& v.z == tree.value.z) {
				tree.value = undefined;
				changed = true;
			}
			break;
		} else if (tree.is_empty()) {
			break;
		} else {
			if (v.x < tree.xMin || tree.xMax <= v.x || v.y < tree.yMin
					|| tree.yMax <= v.y || v.z < tree.zMin || tree.zMax <= v.z) {
				tree = tree.parent;
			} else {
				if (v.x < tree.xMid) {
					if (v.y < tree.yMid) {
						if (v.z < tree.zMid) {
							tree = tree.bot_sw;
						} else {
							tree = tree.bot_nw;
						}
					} else {
						if (v.z < tree.zMid) {
							tree = tree.top_sw;
						} else {
							tree = tree.top_nw;
						}
					}
				} else {
					if (v.y < tree.yMid) {
						if (v.z < tree.zMid) {
							tree = tree.bot_se;
						} else {
							tree = tree.bot_ne;
						}
					} else {
						if (v.z < tree.zMid) {
							tree = tree.top_se;
						} else {
							tree = tree.top_ne;
						}
					}
				}
			}
		}
	}

	if (changed) {
		var valCount = 0;
		while ((!(undefined == tree.parent)) && 1 >= valCount) {
			tree = tree.parent;
			valCount = 0;
			if (tree.top_nw.has_value()) {
				valCount += 1;
				v = tree.top_nw.value;
			}
			if (tree.top_ne.has_value()) {
				valCount += 1;
				v = tree.top_ne.value;
			}
			if (tree.top_sw.has_value()) {
				valCount += 1;
				v = tree.top_sw.value;
			}
			if (tree.top_se.has_value()) {
				valCount += 1;
				v = tree.top_se.value;
			}
			if (tree.bot_nw.has_value()) {
				valCount += 1;
				v = tree.bot_nw.value;
			}
			if (tree.bot_ne.has_value()) {
				valCount += 1;
				v = tree.bot_ne.value;
			}
			if (tree.bot_sw.has_value()) {
				valCount += 1;
				v = tree.bot_sw.value;
			}
			if (tree.bot_se.has_value()) {
				valCount += 1;
				v = tree.bot_se.value;
			}

			if (valCount == 1) {
				tree.top_ne.parent = undefined;
				tree.top_nw.parent = undefined;
				tree.top_se.parent = undefined;
				tree.top_sw.parent = undefined;
				tree.bot_ne.parent = undefined;
				tree.bot_nw.parent = undefined;
				tree.bot_se.parent = undefined;
				tree.bot_sw.parent = undefined;

				tree.top_ne = undefined;
				tree.top_nw = undefined;
				tree.top_se = undefined;
				tree.top_sw = undefined;
				tree.bot_ne = undefined;
				tree.bot_nw = undefined;
				tree.bot_se = undefined;
				tree.bot_sw = undefined;

				tree.value = v;
			}
		}
	}
	return tree;
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

	while (!(undefined == tree)) {
		// this filters out nodes that have become detached in the process of
		// the updates
		if (tree == this || !(tree.parent == undefined)) {
			if (tree.has_value()) {
				v = tree.value;
				v.x = v.next_x;
				v.y = v.next_y;
				v.z = v.next_z;
				if (v.x < tree.xMin || tree.xMax <= v.x || v.y < tree.yMin
						|| tree.yMax <= v.y || v.z < tree.zMin
						|| tree.zMax <= v.z) {
					tree = tree.del(v);
					tree.add(v);
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
		}

		tree = worklist.shift();
	}
};