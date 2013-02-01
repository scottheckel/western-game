// A little HTML 5 Western shooter using Quintus
// Copyright 2013 Scott Heckel, http://www.scottheckel.com
// You may not use this software for commerical purposes without the permission of the author.
window.addEventListener("load", function() {
	var Q = window.Q = Quintus()
		.include("Sprites, Scenes, Input, 2D, Touch, UI")
		.setup({maximize: true})
		.controls().touch();

	Q.gravityX = 0;
	Q.gravityY = 0;

	Q.component("aiShootingZombie", {
		defaults: {
			minSeek: 200 * 200,
			maxSeek: 700 * 700,
			range: 400 * 400,
			speed: 20,
			reload: 1 + Math.random() * 2
		},
		added: function() {
			var p = this.entity.p;
			Q._defaults(p,this.defaults);

	      	this.entity.on("step",this,"step");
		},
		step: function(dt) {
			var player = Q('Player').first(),
				p = this.entity.p,
				dX = player.p.x - p.x,
				dY = player.p.y - p.y,
				d = dX * dX + dY * dY;

			if(d <= p.maxSeek && d >= p.minSeek) {
				if(player.p.y > p.y) {
					p.vy = p.speed;
					p.frame = 2;
				} else if(player.p.y < p.y) {
					p.vy = -p.speed;
					p.frame = 0;
				}

				if(player.p.x > p.x) {
					p.vx = p.speed;
					p.frame = 1;
				} else if(player.p.x < p.x) {
					p.vx = -p.speed;
					p.frame = 3;
				}

				if((p.frame == 1 || p.frame == 3) && Math.abs(dY) > Math.abs(dX)) {
					if(dY > 0) {
						p.frame = 2;
					} else {
						p.frame = 0;
					}
				}

			} else {
				p.vy = p.vx = 0;
			}

			// If reload is ready, then shoot if in distance
			p.reload -= dt;
			if(p.reload <= 0 && d <= p.range) {
				p.reload = 2;

        		var len = Math.sqrt(dX * dX + dY * dY);

				var stage = Q.stage();
				stage.insert(new Q.Bullet({
					x: p.x,
					y: p.y,
					vx: dX * 400 / len,
					vy: dY * 400 / len,
					collisionMask: Q.SPRITE_FRIENDLY,
					type: Q.SPRITE_DEFAULT | Q.SPRITE_ACTIVE | Q.SPRITE_ENEMY
				}));
			}
		}
	});

	Q.Sprite.extend('Enemy', {
		init: function(p) {
			this._super(p, {
				sheet: 'cowboy2',
				speed: 50,
				x: 0,
				y: 0,
				frame: 2,
				health: 1,
				collisionMask: Q.SPRITE_FRIENDLY,
				type: Q.SPRITE_DEFAULT | Q.SPRITE_ENEMY | Q.SPRITE_ACTIVE
			});

			this.add('2d, aiShootingZombie');

			this.on("hit.sprite", function(collision) {
				if(collision.obj.isA('Bullet')) {
					this.p.health--;
					collision.obj.destroy();
					if(this.p.health <= 0) {
						this.destroy();
						if(Q('Enemy').length == 1) {
							Q.pauseGame();
							alert('You win!');
						}
					}
				}
			});
		}
	});

	Q.Sprite.extend('Player', {
		init: function(p) {
			this._super(p, {
				sheet: 'cowboy1',
				type: Q.SPRITE_DEFAULT | Q.SPRITE_FRIENDLY | Q.SPRITE_ACTIVE,
				collisionMask: Q.SPRITE_ENEMY,
				health: 10,
				speed: 200,
				x: 0,
				y: 0,
				facing: 90,
				fx: 0,
				fy: 1,
				frame: 2
			});

			this.add('2d');
			this.on('step');

			this.on("hit.sprite", function(collision) {
				if(collision.obj.isA('Bullet') && this.p.health > 0) {
					this.p.health--;
					collision.obj.destroy();

					$('#currentHealth').css('width', (this.p.health * 10) + 'px');

					if(this.p.health <= 0) {
						Q.pauseGame();
						alert('Game over');
					}
				}
			});
		},
		step: function(dt) {
			if(Gamepads.hasSupport) {
				Gamepads.update();
				var gamepad = Gamepads.getState(0);
				if(gamepad.isConnected) {
					
					// Determine Movement Direction
					var leftStick = gamepad.stickValue(0);
					if(leftStick.x > 0.25 || leftStick.x < -0.25) {
						this.p.vx = leftStick.x * this.p.speed;
					} else {
						this.p.vx = 0;
					}
					if(leftStick.y > 0.25 || leftStick.y < -0.25) {
						this.p.vy = leftStick.y * this.p.speed;
					} else {
						this.p.vy = 0;
					}

					// Determine facing Stick
					var rightStick = gamepad.stickValue(1, true);
					if(rightStick.radial > 0.25) {
						this.p.facing = rightStick.angular * 180 / Math.PI;
						this.p.fx = rightStick.x;
						this.p.fy = rightStick.y;

						if(this.p.facing < -135 || this.p.facing > 135) {
							this.p.frame = 3;
						} else {
							if(this.p.facing >= -135 && this.p.facing <= -45) {
								this.p.frame = 0;
							} else {
								if(this.p.facing <= 135 && this.p.facing >= 45) {
									this.p.frame = 2;
								} else {
									this.p.frame = 1;
								}
							}
						}
					}

					// Gunstuff
					if(this.children[0]) {
						this.children[0].p.frame = this.p.frame;
						this.children[0].fire(this, gamepad);
					}
					$('#support').hide();
				} else {
					$('#support').show();
				}
			} else {
				$('#support').show();
			}
		}
	});

	Q.Sprite.extend('PlayerWeapon', {
		init: function(p) {
			this._super(p, {
				sheet: 'pistol',
				type: Q.SPRITE_NONE
			});

			this.add('2d');
		},
		fire: function(player, gamepad) {
			var delta = this.sheet == 'pistol' ? 50 : 500;
			if(gamepad.buttonHeld(Gamepads.Xbox360.RB, delta, true) || gamepad.buttonNew(Gamepads.Xbox360.RB)) {
				var stage = Q.stage();
				stage.insert(new Q.Bullet({
					x: player.p.x,
					y: player.p.y,
					vx: player.p.fx * 400,
					vy: player.p.fy * 400,
					collisionMask: Q.SPRITE_ENEMY,
					type: Q.SPRITE_DEFAULT | Q.SPRITE_ACTIVE | Q.SPRITE_FRIENDLY
				}));
			}
		}
	});

	Q.Sprite.extend('Bullet', {
		init: function(p) {
			this._super(p, {
				sheet: 'pistol_shot',
				type: Q.SPRITE_DEFAULT | Q.SPRITE_ACTIVE | Q.SPRITE_FRIENDLY,
				alive: 0
			});

			this.add('2d');
			this.on('step');
		},
		step: function(dt) {
			this.p.alive += dt;
			if(this.p.alive > 5) { 
				// don't let them stay alive forever
				this.destroy();
			}
		},
	});

	Q.Sprite.extend('Cactus', {
		init: function(p) {
			this._super(p, {
				sheet: 'cactus',
				x: 0,
				y: 0,
				type: Q.SPRITE_NONE
			});

			this.add('2d');
		}
	});

	Q.scene("level", function(stage) {
		var x, y;

		// Create Player
		var player = stage.insert(new Q.Player());
		var weapon = stage.insert(new Q.PlayerWeapon(), player);
		stage.add("viewport").follow(player);

		// Create Enemies
		var totalEnemies = Math.random() * 15 + 5,
			enemyIndex = 0;
		for(; enemyIndex < totalEnemies; enemyIndex++) {
			var x = Math.random() * 2000 - 1000,
				y = Math.random() * 2000 - 1000,
				cowboyType = Math.floor(Math.random() * 3) + 2;
			stage.insert(new Q.Enemy({x: x, y: y, sheet: 'cowboy' + cowboyType}));
			//stage.insert(new Q.Enemy({x: 500, y: 500, sheet: 'cowboy' + cowboyType}));
		}

		// Create Cactus
		var totalCactus = Math.random() * 100 + 50,
			cactusIndex;
		for(cactusIndex = 0; cactusIndex < totalCactus; cactusIndex++) {
			x = Math.random() * 4000 - 2000;
			y = Math.random() * 4000 - 2000;
			var	frame = Math.floor(Math.random() * 3);
			stage.insert(new Q.Cactus({x: x, y: y, frame: frame}));
		}
	});

	Q.load('western_spritesheet.json, western_spritesheet.png', function() {
		Q.compileSheets("western_spritesheet.png", "western_spritesheet.json");

		Q.stageScene("level");
	});


});