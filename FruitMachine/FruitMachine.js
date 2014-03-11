/* 
  Copyleft 2013, all wrongs reversed 
    Dit is de FruitMachine MUD van Tomas Harkema, met eigen geschreven MUD engine (die nog veel verder valt op te vouwen), voor Node.JS, in 99% pure JavaScript (dus libraryloos).
	Benader deze Node server via telnet o.a.a. over port 9000.
 
	Om dit alles mogelijk te maken zijn diverse StackOverflow boards geraadpleegd.
	Bron: https://github.com/medikoo/cli-color
	Bron: http://www.davidmclifton.com/2011/07/22/simple-telnet-server-in-node-js/
 
 
	Bevat 29 functies, 17 controlestructuren waarvan 4 switches, en 13 if statements. 3 (half) OOP's, 3 datastructuren, 3 verschillende 'DOM' (lees feedback) manipulaties, 
	die ieder op 29 verschillende manieren kunnen aangeroepen worden.
 
	TODO:
	 - Highscoreboard
	 - Per-Client roggelen
	 - Volledig OOP maken
*/
/*jslint browser: true*/
/*globals console,prompt,require*/
var clc = require('cli-color'),
    net = require('net'),
    gameServer = net.createServer(),
    clientList = [],
    gameInstances = [],
    GameInstellingen = {
        startBucks: 10,
        maxBeurten: 8,
        winIncr: 5,
        scoreIncr: 5,
        aantalRollen: 4,
        maxBucks: 100,
        fruitSoorten: [
            clc.yellowBright('Banaan'),
            clc.green('Peer'),
            clc.yellowBright('Citroen'),
            clc.greenBright('Druif'),
            clc.red('Appel'),
            clc.green('Kiwi'),
            "Mandarijn",
            "Perzik",
            "Abrikoos",
            "Kers",
            "Framboos",
            "Braam",
            "Bes"
        ],
        text: {
            "false": "",
            welkom: "\n\n------------------------------------------\nHallo! Ik ben een fruitautomaat!\n------------------------------------------\n\n",
            askAge: clc.bgGreen(" > Ik ben wel eens benieuwd of jij wel oud genoeg bent... Typ even je geboortedatum in en druk op " + clc.red("[enter]") + "\n"),
            oudGenoeg: clc.bgGreen(" > Je bent oud genoeg! Lets play!") + "\n",
            intro: clc.bgGreen("\n\n------------------------------------------\n\nJe krijgt van mij " + clc.red(this.startBucks) + " bucks, daarmee mag je beginnen. Good luck!\ntyp " + clc.red("help") + " voor uitleg, typ " + clc.red("start") + " om te beginnen.") + "\n",
            help: "\n\n------------------------------------------\nDit is een fruitmachine. Verlies geld door een gok te wagen, verdien " + this.startBucks + " Bucks door " + this.aantalRollen + " op een rij te krijgen. Per beurt heb je de keuze om rollen vast te houden, of om door te gaan. Je hebt totaal " + this.maxBeurten + " beurten om " + this.aantalRollen + " op een rij te krijgen. Veel succes!\n\nCommando's\n\nroll: Rol de rollers\nhold: Hou een roller vast. (bijv. \"hold 1,2\", zo hou je roller 1 en 2 vast.)\n\n > Druk op [enter] om weer verder te gaan.\n------------------------------------------\n\n",
            later: "LATER",
            beurtVoorbij: "\n\nEn dit is de eindstand! Je hebt helaas niks gewonnen...\n---\nWil je opnieuw beginnen, kosten 1 Bucks?\n\n Typ start om opnieuw te beginnen.\n",
            gewonnen: clc.bgGreen("Nice man! Je hebt " + this.winIncr + " bucks gewonnen!\n\n Typ start om opnieuw te beginnen.\n"),
            gameOver: "\n:(\n\nGame over! Helaas, je Bucks zijn op..."
        },
        process: {
            0: {
                type: "write",
                text: "welkom",
                exec: function(data, self) {
                    self.state += 1;
                    self.proceed(self);
                }
            },
            1: {
                type: "write",
                text: "askAge",
                exec: function(data, self) {
                    self.state += 1;
                }
            },
            2: {
                type: "ask",
                text: "false",
                exec: function(data, self) {
                    var invoer = data,
                        datum = new Date(),
                        jaar = datum.getFullYear(),
                        diff = jaar - invoer;
                    if (diff >= 18) {
                        self.state += 1;
                        self.EngineRoll(self);
                    } else {
                        self.state = 99;
                        self.EngineRoll(self);
                    }
                }
            },
            3: {
                type: "write",
                text: "oudGenoeg",
                exec: function(data, self) {
                    self.state += 1;
                    self.EngineRoll(self);
                }
            },
            4: {
                type: "write",
                text: "intro",
                exec: function(data, self) {
                    self.bucks = self.instellingen.startBucks;
                    self.state += 1;
                }
            },
            5: {
                type: "ask",
                text: "false",
                exec: function(data, self) {
                    var get = data;
                    switch (get) {
                        case "help":
                            self.state += 1;
                            self.EngineRoll(self);
                            break;
                        case "start":
                            self.roll();
                            self.state += 1;
                            self.EngineRoll(self);
                            break;
                        default:
                            self.state += -1;
                            self.EngineRoll(self);
                    }
                }
            },
            6: {
                type: "write",
                text: "false",
                exec: function(data, self) {
                    if (self.beurt > self.instellingen.maxBeurten) {
                        self.beurt = 1;
                        self.state = 8;
                        self.EngineRoll(self);
                    } else {
                        if (self.bucks === 0) {
                            self.state = 90;
                            self.EngineRoll(self);
                        } else {
                            if (self.rollen[1].name === self.rollen[2].name && self.rollen[1].name === self.rollen[3].name && self.rollen[1].name === self.rollen[4].name && self.rollen[1].name === self.rollen[5].name) {
                                self.showState(self);
                                self.state = 10;
                                self.EngineRoll(self);
                            } else {
                                self.showState(self);
                                self.state += 1;
                            }
                        }
                    }
                }
            },
            7: {
                type: "ask",
                text: "false",
                exec: function(data, self) {
                    var get = data,
                        command = get.split(" ");
                    functions[command]
                    switch (command[0]) {
                        case "roll":
                            //rollings();
                            self.roll();
                            self.state += -1;
                            self.EngineRoll(self);
                            break;
                        case "hold":
                            self.hold(command[1]);
                            self.state += -1;
                            self.EngineRoll(self);
                            break;
                        case "restart":
                            self.reset();
                            self.state = 4;
                            self.EngineRoll(self);
                            break;
                        default:
                            self.state += -1;
                            self.EngineRoll(self);
                    }
                }
            },
            8: {
                type: "write",
                text: "beurtVoorbij",
                exec: function(data, self) {
                    self.state += 1;
                    self.EngineRoll(self);
                }
            },
            9: {
                type: "ask",
                text: "false",
                exec: function(data, self) {
                    var get = data,
                        command = get.split(" ");
                    switch (command[0]) {
                        case "start":
                            self.state = 6;
                            self.bucks += -1;
                            self.reset();
                            self.roll();
                            self.EngineRoll(self);
                            break;
                        default:
                    }
                }
            },
            10: {
                type: "write",
                text: "gewonnen",
                exec: function(data, self) {
                    self.state += 1;
                    self.beurt = 1;
                    self.bucks = self.bucks + self.instellingen.winIncr;
                    self.score += self.instellingen.scoreIncr;
                    self.EngineRoll(self);
                }
            },
            11: {
                type: "ask",
                text: "false",
                exec: function(data, self) {
                    var get = data,
                        command = get.split(" ");
                    switch (command[0]) {
                        case "start":
                            self.state = 6;
                            self.reset();
                            self.roll();
                            self.EngineRoll(self);
                            break;
                        default:
                    }
                }
            },
            90: {
                type: "write",
                text: "gameOver",
                exec: function(data, self) {
                    self.state = 0;
                    self.EngineRoll(self);
                }
            },
            99: {
                type: "write",
                text: "later",
                exec: function(data, self) {
                    self.state = 0;
                    self.EngineRoll(self);
                }
            },
            help: {
                type: "ask",
                text: "help",
                exec: function(data, self) {
                    if (self.instellingen.process[data].ask) {
                        self.state += -1;
                    } else {
                        self.state = data;
                    }
                }
            }
        }
    },
    Game = function(hoeveelRollen, client) {
        this.Engine = [];
        this.state = 0;
        this.beurt = 0;
        this.score = 0;
        this.client = client;
        this.rollen = {};
        this.instellingen = GameInstellingen;
        this.EngineTypes = {
            "write": function(data, self, get, exe) {

                self.client.write(data);
                // Voer het meegegeven gedrag uit.
                exe(get, self);
            },
            "ask": function(data, self, get, exe) {

                self.client.write(data);
                // Voer het meegegeven gedrag uit.
                exe(get, self);
            }
        };
        /**
         * Game Initialization
         * @param  {Integer} numberOfRollen Hoeveel rollen moeten er aangemaakt worden?
         */
        this.init = function(numberOfRollen) {
            var i = 1;
            numberOfRollen += 1;
            for (i = 1; i < numberOfRollen; i += 1) {
                this.rollen[i] = {
                    name: "",
                    hold: false
                };
            }
        };
        this.init(hoeveelRollen);

        /**
         * Schoont de ingegeven data op.
         * @param   {Object} data    Het vieze data (Object!)
         * @returns {String}	        Return de opgeschoonde data.
         */
        this.EngineSchoonDataOp = function(data) {
            /* 
						Bron: http://www.davidmclifton.com/2011/07/22/simple-telnet-server-in-node-js/
						Doel: verwijder alle \n \r uit de string.
					*/
            return data.toString().replace(/(\r\n|\n|\r)/gm, "");
        };
        /**
         * Voer de functie van de huidige roll uit.
         * @param  {Object} client    Het algemene client object.
         * @param  {String} get       De data meegegeven door het data-event
         * @global types
         * @global process
         * @global state
         * @return {void}   void
         */
        this.EngineExecute = function(self, get) {
            //var process wordt in regel 123 gedefinieerd. Andersom veel meer errors. Alles gaat uiteindelijk toch door de data-pipe.
            this.EngineTypes[this.instellingen.process[this.state].type](this.instellingen.text[this.instellingen.process[this.state].text], self, get, this.instellingen.process[this.state].exec);
        };
        /**
         * Roll de engine verder
         * @param  {Object} client    Het algemene client Object
         * @return {void}   void
         */
        this.EngineRoll = function(self) {
            this.EngineExecute(self, "");
            //this.Engine.execute(client, "");
        };
        /**
         * Roll de engine verder, met meegegeven data
         * @param  {Object} client    Het algemene client Object
         * @param  {String} data      De meegegeven data
         * @return {void}   void
         */
        this.EngineRollWithData = function(self, data) {
            return this.EngineExecute(self, data);
            //this.Engine.execute(client, data);
        };
        /**
         * Zet de Engine in de hulpstatus. Geef de huidige status mee voor de restart
         * @param  {Object} client      Het algemene client Object
         * @param  {String} getState    De recovery van de state variable
         * @return {void}   void
         */
        this.showHelp = function(client, getState) {
            this.state = "help";
            this.Engine.rollWithData(client, getState);
        };


        this.laatRollenZien = function() {
            var output = "",
                i;
            for (i in this.rollen) {
                if (this.rollen.hasOwnProperty(i)) {
                    if (this.rollen[i].hold === false) {
                        output += "[ " + this.instellingen.fruitSoorten[this.rollen[i].name] + " ] ";
                    } else {
                        output += clc.bgRed("[> " + this.instellingen.fruitSoorten[this.rollen[i].name] + " ]") + " ";
                    }
                }
            }
            return output;
        };
        this.start = function(self) {
            this.bucks = this.instellingen.startBucks;
            this.beurt = 0;
            this.EngineRoll(self);
        };
        this.proceed = function(self, data) {
            this.EngineRollWithData(self, data);
        };
        this.roll = function() {
            this.beurt += 1;
            var i;
            for (i in this.rollen) {
                // JSLint, DOH!
                if (this.rollen.hasOwnProperty(i)) {
                    if (this.rollen[i].hold === false) {
                        this.rollen[i].name = Math.floor(Math.random() * this.instellingen.fruitSoorten.length);
                    }
                }
            }
        };
        this.hold = function(hold) {
            var holders = hold.split(","),
                i;
            for (i in holders) {
                if (holders.hasOwnProperty(i)) {
                    if (this.rollen[holders[i]] !== undefined) {
                        this.rollen[holders[i]].hold = true;
                    }
                }
            }
        };
        this.reset = function() {
            var i;
            for (i in this.rollen) {
                if (this.rollen.hasOwnProperty(i)) {
                    this.rollen[i].hold = false;
                }
            }
        };
        this.GI = function(self) {
            return "\n\n------------------------------------------\n" + clc.bgGreen("Bucks: " + clc.red(this.bucks) + ", Beurt: " + clc.red(this.beurt) + " Roll:") + " Score: " + clc.red(this.score) + " " + this.laatRollenZien() + "\n------------------------------------------\n\n > Wat wil je doen? roll, hold?\n";
        };
        this.showState = function(self) {
            self.client.write(this.GI(self));
        };
    };

gameServer.on('connection', function(client) {
    client.name = client.remoteAddress + ':' + client.remotePort;
    client.write('Hi ' + client.name + '!\n');
    clientList.push(client);

    gameInstances[client.remotePort] = new Game(5, client);
    gameInstances[client.remotePort].start(gameInstances[client.remotePort]);

    client.on('data', function(data) {
        var get = gameInstances[client.remotePort].EngineSchoonDataOp(data);
        gameInstances[client.remotePort].proceed(gameInstances[client.remotePort], get);
    });
    client.on('close', function(client) {
        gameInstances[client.remotePort] = 0;
        console.log(client.remotePort + "Is weggegaan");
    });
});
setInterval(function() {
    var i;
    console.log("--------\n");
    for (i in gameInstances) {
        if (gameInstances.hasOwnProperty(i)) {
            console.log(i + "," + gameInstances[i].score);
        }
    }
}, 1000);


gameServer.listen(8080);