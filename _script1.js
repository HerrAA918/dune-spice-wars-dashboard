
        // Haxe Unserializer implementation for browser
        class HaxeUnserializer {
            constructor(buf) {
                this.buf = buf;
                this.length = buf.length;
                this.pos = 0;
                this.scache = [];
                this.cache = [];
            }

            readDigits() {
                let k = 0;
                let s = false;
                let fpos = this.pos;
                while (true) {
                    if (this.pos >= this.length) break;
                    let c = this.buf.charCodeAt(this.pos);
                    if (c === 45) { // '-'
                        if (this.pos !== fpos) break;
                        s = true;
                        this.pos++;
                        continue;
                    }
                    if (c < 48 || c > 57) break;
                    k = k * 10 + (c - 48);
                    this.pos++;
                }
                if (s) k *= -1;
                return k;
            }

            readFloat() {
                let p1 = this.pos;
                while (true) {
                    if (this.pos >= this.length) break;
                    let c = this.buf.charCodeAt(this.pos);
                    if ((c >= 43 && c < 58) || c === 101 || c === 69) {
                        this.pos++;
                    } else {
                        break;
                    }
                }
                let s = this.buf.substring(p1, this.pos);
                return parseFloat(s);
            }

            unserializeObject(o) {
                while (true) {
                    if (this.pos >= this.length) throw new Error("Invalid object");
                    if (this.buf.charCodeAt(this.pos) === 103) { // 'g'
                        break;
                    }
                    let k = this.unserialize();
                    if (typeof k !== 'string') throw new Error("Invalid object key: " + k);
                    let v = this.unserialize();
                    o[k] = v;
                }
                this.pos++; // skip 'g'
            }

            unserializeEnum(name, tag) {
                if (this.buf.charCodeAt(this.pos++) !== 58) { // ':'
                    throw new Error("Invalid enum format");
                }
                let nargs = this.readDigits();
                let args = [];
                while (nargs-- > 0) {
                    args.push(this.unserialize());
                }
                return { __enum__: name, tag: tag, args: args };
            }

            readBytes(len) {
                const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789%:";
                const CODES = new Array(256);
                for (let i = 0; i < BASE64.length; i++) {
                    CODES[BASE64.charCodeAt(i)] = i;
                }
                
                let rest = len & 3;
                let size = ((len >> 2) * 3) + (rest >= 2 ? rest - 1 : 0);
                let bytes = new Uint8Array(size);
                let bpos = 0;
                let i = this.pos;
                let max = i + (len - rest);
                while (i < max) {
                    let c1 = CODES[this.buf.charCodeAt(i++)];
                    let c2 = CODES[this.buf.charCodeAt(i++)];
                    bytes[bpos++] = (c1 << 2) | (c2 >> 4);
                    let c3 = CODES[this.buf.charCodeAt(i++)];
                    bytes[bpos++] = (c2 << 4) | (c3 >> 2);
                    let c4 = CODES[this.buf.charCodeAt(i++)];
                    bytes[bpos++] = (c3 << 6) | c4;
                }
                if (rest >= 2) {
                    let c1 = CODES[this.buf.charCodeAt(i++)];
                    let c2 = CODES[this.buf.charCodeAt(i++)];
                    bytes[bpos++] = (c1 << 2) | (c2 >> 4);
                    if (rest === 3) {
                        let c3 = CODES[this.buf.charCodeAt(i++)];
                        bytes[bpos++] = (c2 << 4) | (c3 >> 2);
                    }
                }
                this.pos += len;
                return bytes;
            }

            unserialize() {
                let charCode = this.buf.charCodeAt(this.pos++);
                switch (charCode) {
                    case 110: return null;
                    case 116: return true;
                    case 102: return false;
                    case 122: return 0;
                    case 105: return this.readDigits();
                    case 73: return this.readDigits();
                    case 100: return this.readFloat();
                    case 121: {
                        let len = this.readDigits();
                        if (this.buf.charCodeAt(this.pos++) !== 58 || this.length - this.pos < len) {
                            throw new Error("Invalid string length");
                        }
                        let s = this.buf.substring(this.pos, this.pos + len);
                        this.pos += len;
                        s = safeUrlDecode(s);
                        this.scache.push(s);
                        return s;
                    }
                    case 107: return NaN;
                    case 109: return -Infinity;
                    case 112: return Infinity;
                    case 97: {
                        let a = [];
                        this.cache.push(a);
                        while (true) {
                            let c = this.buf.charCodeAt(this.pos);
                            if (c === 104) {
                                this.pos++;
                                break;
                            }
                            if (c === 117) {
                                this.pos++;
                                let n = this.readDigits();
                                a[a.length + n - 1] = null;
                            } else {
                                a.push(this.unserialize());
                            }
                        }
                        return a;
                    }
                    case 111: {
                        let o = {};
                        this.cache.push(o);
                        this.unserializeObject(o);
                        return o;
                    }
                    case 114: {
                        let n = this.readDigits();
                        return this.cache[n];
                    }
                    case 82: {
                        let n = this.readDigits();
                        return this.scache[n];
                    }
                    case 120: throw this.unserialize();
                    case 99: {
                        let name = this.unserialize();
                        let o = { __class__: name };
                        this.cache.push(o);
                        this.unserializeObject(o);
                        return o;
                    }
                    case 119: {
                        let name = this.unserialize();
                        let tag = this.unserialize();
                        let e = this.unserializeEnum(name, tag);
                        this.cache.push(e);
                        return e;
                    }
                    case 106: {
                        let name = this.unserialize();
                        this.pos++;
                        let index = this.readDigits();
                        let e = this.unserializeEnum(name, "index_" + index);
                        this.cache.push(e);
                        return e;
                    }
                    case 108: {
                        let l = [];
                        this.cache.push(l);
                        while (this.buf.charCodeAt(this.pos) !== 104) {
                            l.push(this.unserialize());
                        }
                        this.pos++;
                        return l;
                    }
                    case 98: {
                        let h = {};
                        this.cache.push(h);
                        while (this.buf.charCodeAt(this.pos) !== 104) {
                            let s = this.unserialize();
                            h[s] = this.unserialize();
                        }
                        this.pos++;
                        return h;
                    }
                    case 113: {
                        let h = {};
                        this.cache.push(h);
                        let c = this.buf.charCodeAt(this.pos++);
                        while (c === 58) {
                            let i = this.readDigits();
                            h[i] = this.unserialize();
                            c = this.buf.charCodeAt(this.pos++);
                        }
                        if (c !== 104) throw new Error("Invalid IntMap format");
                        return h;
                    }
                    case 77: {
                        let entries = [];
                        let h = { __type__: "ObjectMap", entries: entries };
                        this.cache.push(h);
                        while (this.buf.charCodeAt(this.pos) !== 104) {
                            let k = this.unserialize();
                            let v = this.unserialize();
                            entries.push({ key: k, value: v });
                        }
                        this.pos++;
                        return h;
                    }
                    case 118: {
                        let d;
                        let c = this.buf.charCodeAt(this.pos);
                        if (c >= 48 && c <= 57 && this.buf.charCodeAt(this.pos + 1) >= 48 && this.buf.charCodeAt(this.pos + 1) <= 57 &&
                            this.buf.charCodeAt(this.pos + 2) >= 48 && this.buf.charCodeAt(this.pos + 2) <= 57 &&
                            this.buf.charCodeAt(this.pos + 3) >= 48 && this.buf.charCodeAt(this.pos + 3) <= 57 &&
                            this.buf.charCodeAt(this.pos + 4) === 45) {
                            let dateStr = this.buf.substring(this.pos, this.pos + 19);
                            d = new Date(dateStr.replace(" ", "T"));
                            this.pos += 19;
                        } else {
                            d = new Date(this.readFloat());
                        }
                        this.cache.push(d);
                        return d;
                    }
                    case 115: {
                        let len = this.readDigits();
                        this.pos++;
                        let bytes = this.readBytes(len);
                        this.cache.push(bytes);
                        return bytes;
                    }
                    case 67: {
                        let name = this.unserialize();
                        let o = { __class__: name, __custom__: true };
                        this.cache.push(o);
                        let customData = [];
                        while (this.buf.charCodeAt(this.pos) !== 103) {
                            customData.push(this.unserialize());
                        }
                        this.pos++;
                        o.data = customData;
                        return o;
                    }
                    case 65: return { __class_ref__: this.unserialize() };
                    case 66: return { __enum_ref__: this.unserialize() };
                }
                this.pos--;
                throw new Error("Invalid char " + this.buf.charAt(this.pos) + " (" + charCode + ") at position " + this.pos);
            }
        }

        // Safe url decode helper
        function safeUrlDecode(str) {
            try {
                return decodeURIComponent(str);
            } catch(e) {
                return str.replace(/%([0-9A-Fa-f]{2})/g, (match, p1) => String.fromCharCode(parseInt(p1, 16)));
            }
        }

        // Safe Lucide creator
        function safeCreateIcons() {
            try {
                if (typeof lucide !== 'undefined' && lucide.createIcons) {
                    lucide.createIcons();
                }
            } catch (e) {
                console.warn("Lucide icons could not be rendered:", e);
            }
        }

        // Global Variables
        const PRELOADED_DATA = {"conquest":[],"games":[]};
        let currentProfileData = PRELOADED_DATA;
        let activeMode = 'multi'; // 'multi', 'single', 'all'
        
        let chartGamesInstance = null;
        let chartReasonsInstance = null;

        // Faction color helper
        function getFactionColor(faction) {
            switch (faction) {
                case 'Atreides': return '#4a90e2';
                case 'Harkonnen': return '#eb5757';
                case 'Smugglers': return '#f2994a';
                case 'Fremen': return '#27ae60';
                case 'Corrino': return '#f2c94c';
                case 'Ecaz': return '#d0021b';
                case 'Vernius': return '#9b51e0';
                default: return '#828282';
            }
        }

        // Hero name helper
        function getHeroName(heroId, faction) {
            if (!heroId) return '-';
            const cleanId = heroId.trim();
            const mappings = {
                'Atreides': {
                    'A_Hero_1': 'Duncan Idaho',
                    'A_Hero_2': 'Gurney Halleck'
                },
                'Harkonnen': {
                    'H_Hero_1': 'Glossu Rabban',
                    'H_Hero_2': 'Iakin Nefud'
                },
                'Smugglers': {
                    'S_Hero_1': 'Bannerjee',
                    'S_Hero_2': 'Drisq'
                },
                'Fremen': {
                    'F_Hero_1': 'Chani Kynes',
                    'F_Hero_2': 'Otheym'
                },
                'Corrino': {
                    'C_Hero_1': 'Wensicia Corrino',
                    'C_Hero_2': 'Captain Aramsham'
                },
                'Ecaz': {
                    'E_Hero_1': 'Whitmore Bludd',
                    'E_Hero_2': 'Ilesa Ecaz'
                },
                'Vernius': {
                    'V_Hero_1': 'Nuwa Cenva',
                    'V_Hero_2': "C'Tair Pilru",
                    'I_Hero_1': 'Nuwa Cenva',
                    'I_Hero_2': "C'Tair Pilru"
                }
            };
            const factionMap = mappings[faction];
            if (factionMap && factionMap[cleanId]) {
                return factionMap[cleanId];
            }
            return cleanId
                .replace(/^[A-Z]_/, '')
                .replace('_', ' ');
        }

        // Hero description helper
        function getHeroDescription(heroId, faction) {
            if (!heroId) return '';
            const cleanId = heroId.trim();
            const descriptions = {
                'Atreides': {
                    'A_Hero_1': "<strong>Health:</strong> 1000 &nbsp;|&nbsp; <strong>Power:</strong> 30 &nbsp;|&nbsp; <strong>Armor:</strong> 5<br><br>Duncan Idaho: Combat-focused hero. Gains Heroism stacks when allies buff him, scaling his combat strength, and has Duncan's Last Stand active ability.",
                    'A_Hero_2': "<strong>Health:</strong> 1000 &nbsp;|&nbsp; <strong>Power:</strong> 30 &nbsp;|&nbsp; <strong>Armor:</strong> 5<br><br>Gurney Halleck: Frontier defender. Extremely resilient, buffs nearby friendly unit attack speed and defense, holding the center of battle."
                },
                'Harkonnen': {
                    'H_Hero_1': "<strong>Health:</strong> 1000 &nbsp;|&nbsp; <strong>Power:</strong> 30 &nbsp;|&nbsp; <strong>Armor:</strong> 5<br><br>Glossu Rabban: Opression leader. Grants +1 free Heavy Militia to all owned villages (boosting economy) and buffs Rabban's Thrall units.",
                    'H_Hero_2': "<strong>Health:</strong> 800 &nbsp;|&nbsp; <strong>Power:</strong> 25 &nbsp;|&nbsp; <strong>Armor:</strong> 3<br><br>Iakin Nefud: Sacrificial horde commander. Spends friendly troopers to heal himself and double damage, while refunding 50%+ Solari on unit deaths."
                },
                'Smugglers': {
                    'S_Hero_1': "<strong>Health:</strong> 800 &nbsp;|&nbsp; <strong>Power:</strong> 25 &nbsp;|&nbsp; <strong>Armor:</strong> 3<br><br>Bannerjee: Aggressive thug leader. Regenerates unit health in Underworld villages, restores supplies after sieges, and recruits Scavengers.",
                    'S_Hero_2': "<strong>Health:</strong> 600 &nbsp;|&nbsp; <strong>Power:</strong> 20 &nbsp;|&nbsp; <strong>Armor:</strong> 2<br><br>Drisq: Covert support specialist. Detects stealth units at very long range, stealths friendly units in same region, and cuts spy operation costs."
                },
                'Fremen': {
                    'F_Hero_1': "<strong>Health:</strong> 800 &nbsp;|&nbsp; <strong>Power:</strong> 25 &nbsp;|&nbsp; <strong>Armor:</strong> 3<br><br>Chani Kynes: Ultimate stealth ambusher. Increases stealth unit movement speeds, bypasses sandworm attacks, and delivers high-damage surprise strikes.",
                    'F_Hero_2': "<strong>Health:</strong> 800 &nbsp;|&nbsp; <strong>Power:</strong> 25 &nbsp;|&nbsp; <strong>Armor:</strong> 3<br><br>Otheym: Desert survival combatant. Increases armor of nearby units and excels at ambushing enemies."
                },
                'Corrino': {
                    'C_Hero_1': "<strong>Health:</strong> 800 &nbsp;|&nbsp; <strong>Power:</strong> 25 &nbsp;|&nbsp; <strong>Armor:</strong> 3<br><br>Wensicia Corrino: Conscript commander. Boosts conscript training speeds, spends Manpower to heal them globally, and deploys Laza Tigers.",
                    'C_Hero_2': "<strong>Health:</strong> 1000 &nbsp;|&nbsp; <strong>Power:</strong> 30 &nbsp;|&nbsp; <strong>Armor:</strong> 5<br><br>Captain Aramsham: Sardaukar executioner. Executes enemies below 50% health, enhancing nearby Sardaukar combat capabilities."
                },
                'Ecaz': {
                    'E_Hero_1': "<strong>Health:</strong> 1000 &nbsp;|&nbsp; <strong>Power:</strong> 30 &nbsp;|&nbsp; <strong>Armor:</strong> 5<br><br>Whitmore Bludd: Champion master swordmaster. Can appoint a second Champion unit of a different type, boosting max health per Champion's Trophy.",
                    'E_Hero_2': "<strong>Health:</strong> 600 &nbsp;|&nbsp; <strong>Power:</strong> 20 &nbsp;|&nbsp; <strong>Armor:</strong> 2<br><br>Ilesa Ecaz: Masterpiece defender. Feints death to respawn at Rally Point, and triggers a -50 Landsraad Standing penalty on attackers if killed on home soil."
                },
                'Vernius': {
                    'V_Hero_1': "<strong>Health:</strong> 880 &nbsp;|&nbsp; <strong>Power:</strong> 35 &nbsp;|&nbsp; <strong>Armor:</strong> 4<br><br>Nuwa Cenva: Drone support engineer. Enhances drone recruitment speeds, deploys repair stations, and extends region spying operations.",
                    'V_Hero_2': "<strong>Health:</strong> 800 &nbsp;|&nbsp; <strong>Power:</strong> 25 &nbsp;|&nbsp; <strong>Armor:</strong> 3<br><br>C'Tair Pilru: Guerrilla stealth specialist. Gains stealth near friendly units, adds armory slots, and performs one-hit kills in Vernius territory.",
                    'I_Hero_1': "<strong>Health:</strong> 880 &nbsp;|&nbsp; <strong>Power:</strong> 35 &nbsp;|&nbsp; <strong>Armor:</strong> 4<br><br>Nuwa Cenva: Drone support engineer. Enhances drone recruitment speeds, deploys repair stations, and extends region spying operations.",
                    'I_Hero_2': "<strong>Health:</strong> 800 &nbsp;|&nbsp; <strong>Power:</strong> 25 &nbsp;|&nbsp; <strong>Armor:</strong> 3<br><br>C'Tair Pilru: Guerrilla stealth specialist. Gains stealth near friendly units, adds armory slots, and performs one-hit kills in Vernius territory."
                }
            };
            const factionMap = descriptions[faction];
            return (factionMap && factionMap[cleanId]) || '';
        }

        // Councilor description helper
        function getCouncillorDescription(cName) {
            if (!cName) return '';
            const descriptions = {
                // â”€â”€ House Atreides â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                'Lady Jessica': "<strong>House Atreides</strong> &nbsp;|&nbsp; <em>Bene Gesserit sister &amp; political manipulator</em><br><br>" +
                    "<strong>+10%</strong> Landsraad Standing (passive)<br>" +
                    "<strong>Active:</strong> Spend 50 Influence to impose any Treaty on another faction (they can refuse if they have 100 Power)<br>" +
                    "<strong>Active:</strong> Can negate any Landsraad resolution by spending Influence<br><br>" +
                    "<em>Best for:</em> Diplomatic control and avoiding wars",

                'Duncan Idaho': "<strong>House Atreides</strong> &nbsp;|&nbsp; <em>Swordmaster &amp; Sietch diplomat</em><br><br>" +
                    "<strong>+100%</strong> Fremen Sietch relationship growth speed<br>" +
                    "<strong>-10%</strong> Authority cost to capture villages<br>" +
                    "<strong>+1</strong> Authority per allied Sietch per day<br><br>" +
                    "<em>Best for:</em> Early expansion and Fremen alliances",

                'Young Paul Atreides': "<strong>House Atreides</strong> &nbsp;|&nbsp; <em>Prescient heir &amp; agent recruiter</em><br><br>" +
                    "Reveals upcoming Landsraad Resolution outcomes before voting<br>" +
                    "<strong>-25%</strong> Agent recruitment time<br>" +
                    "Agents start with an additional trait<br><br>" +
                    "<em>Best for:</em> Landsraad preparation and espionage builds",

                'Wellington Yueh': "<strong>House Atreides</strong> &nbsp;|&nbsp; <em>Suk Doctor &amp; researcher</em><br><br>" +
                    "<strong>+2</strong> Knowledge per day (passive)<br>" +
                    "Biological (non-robotic) units gain increased Health and Health Regeneration<br>" +
                    "Unlocks medical building upgrades earlier<br><br>" +
                    "<em>Best for:</em> Research speed and military survivability",

                'Thufir Hawat': "<strong>House Atreides</strong> &nbsp;|&nbsp; <em>Master of Assassins &amp; Mentat</em><br><br>" +
                    "All Agents gain <strong>+1 bonus trait</strong><br>" +
                    "<strong>Active:</strong> Spend Solari to accelerate espionage mission progress<br>" +
                    "<strong>Active:</strong> Spend Solari to accelerate village building construction<br>" +
                    "Operations on a village temporarily boost its production for 2 days<br><br>" +
                    "<em>Best for:</em> Espionage-focused builds and rapid development",

                // â”€â”€ House Harkonnen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                'Piter de Vries': "<strong>House Harkonnen</strong> &nbsp;|&nbsp; <em>Twisted Mentat &amp; spymaster</em><br><br>" +
                    "<strong>Active:</strong> Sacrifice an Agent to reduce an ongoing mission's cost and preparation time<br>" +
                    "When a friendly Agent is eliminated on a mission, gain <strong>+Intel &amp; +Solari</strong> as compensation<br>" +
                    "Reduces the Solari cost of initiating spy operations<br><br>" +
                    "<em>Best for:</em> High-volume espionage and agent attrition builds",

                'Feyd-Rautha Harkonnen': "<strong>House Harkonnen</strong> &nbsp;|&nbsp; <em>Na-Baron &amp; Landsraad corruptor</em><br><br>" +
                    "Unlocks ability to spend Solari to corrupt Landsraad votes<br>" +
                    "<strong>-25%</strong> Agent recruitment time<br>" +
                    "Earns <strong>+Influence</strong> for each Landsraad resolution that passes corruptly<br><br>" +
                    "<em>Best for:</em> Landsraad manipulation and influence economy",

                'Cron Vatia': "<strong>House Harkonnen</strong> &nbsp;|&nbsp; <em>Slavemaster &amp; construction chief</em><br><br>" +
                    "<strong>+1</strong> free Heavy Militia unit garrisoned in every owned village<br>" +
                    "<strong>-20%</strong> building construction time in all villages<br>" +
                    "Slave-labor villages generate extra Manpower<br><br>" +
                    "<em>Best for:</em> Fast infrastructure and village defense",

                'Umman Kudu': "<strong>House Harkonnen</strong> &nbsp;|&nbsp; <em>Captain of the Guard &amp; warlord</em><br><br>" +
                    "<strong>+Manpower</strong> production globally<br>" +
                    "Units in an active spy operation zone gain <strong>+Armor</strong><br>" +
                    "Can spend Manpower to accelerate military recruitment<br><br>" +
                    "<em>Best for:</em> Military-heavy builds and sustained army output",

                // â”€â”€ House Vernius of Ix â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                'Bolig Avati': "<strong>House Vernius</strong> &nbsp;|&nbsp; <em>Ixian engineer &amp; vault architect</em><br><br>" +
                    "Allows building multiple Vault District structures simultaneously<br>" +
                    "<strong>+Knowledge</strong> production from Vault Districts<br>" +
                    "Reduces Knowledge research costs for Ixian tech tree<br><br>" +
                    "<em>Best for:</em> Fast tech progression and Ix economic engine",

                'Bronso Vernius': "<strong>House Vernius</strong> &nbsp;|&nbsp; <em>Rebel thinker &amp; village captor</em><br><br>" +
                    "<strong>-15%</strong> Authority cost to capture enemy villages<br>" +
                    "Reduces cooldown on village annexation operations<br>" +
                    "Provides research bonuses tied to captured villages<br><br>" +
                    "<em>Best for:</em> Aggressive expansion and village snowball builds",

                'Tessia Vernius': "<strong>House Vernius</strong> &nbsp;|&nbsp; <em>Ixian spy &amp; node controller</em><br><br>" +
                    "Expands the number of active analytical spy nodes<br>" +
                    "<strong>+Intel</strong> generation from node networks<br>" +
                    "Improves counter-intelligence â€” harder for enemies to run ops on you<br><br>" +
                    "<em>Best for:</em> Espionage-centric Ix builds",

                'Cammar Pilru': "<strong>House Vernius</strong> &nbsp;|&nbsp; <em>Ixian ambassador &amp; garrison defender</em><br><br>" +
                    "Nodes in controlled regions grant <strong>+Defense</strong> to garrisoned units<br>" +
                    "Improves local intel coverage radius<br>" +
                    "Reduces the Influence cost of diplomatic interactions in controlled regions<br><br>" +
                    "<em>Best for:</em> Defensive turtling and regional control",

                // â”€â”€ The Smugglers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                'Lingar Bewt': "<strong>The Smugglers</strong> &nbsp;|&nbsp; <em>Water merchant &amp; economy specialist</em><br><br>" +
                    "<strong>+Water</strong> income per Underworld node controlled<br>" +
                    "Unlocks additional Water network expansion slots<br>" +
                    "Water sold on the black market generates bonus Solari<br><br>" +
                    "<em>Best for:</em> Water economy and Solari generation builds",

                'Staban Tuek': "<strong>The Smugglers</strong> &nbsp;|&nbsp; <em>Underworld chief &amp; network builder</em><br><br>" +
                    "<strong>+1</strong> building slot in every Underworld Headquarters<br>" +
                    "Fully-slotted Underworld HQs adjacent to towns generate <strong>+4 Solari</strong> per day<br>" +
                    "Unlocks premium Underworld HQ upgrades<br><br>" +
                    "<em>Best for:</em> Smuggler economic engine and wide HQ networks",

                'Lashon Hara': "<strong>The Smugglers</strong> &nbsp;|&nbsp; <em>Information broker &amp; trade specialist</em><br><br>" +
                    "<strong>+Influence</strong> production per active trade route<br>" +
                    "<strong>+Intel</strong> from each Underworld node reporting on enemy activity<br>" +
                    "Trade missions generate bonus Solari on completion<br><br>" +
                    "<em>Best for:</em> Influence and intel income builds",

                'Stakkanov': "<strong>The Smugglers</strong> &nbsp;|&nbsp; <em>Isolated village fortifier</em><br><br>" +
                    "Villages not adjacent to other friendly villages gain <strong>+Production</strong> bonuses<br>" +
                    "Isolated villages receive <strong>+Defense</strong> and increased garrison strength<br>" +
                    "Bonus scales with how isolated the outpost is<br><br>" +
                    "<em>Best for:</em> Spread-out expansion and self-sustaining outposts",

                // â”€â”€ The Fremen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                'Mother Ramallo': "<strong>The Fremen</strong> &nbsp;|&nbsp; <em>Reverend Mother &amp; rebellion instigator</em><br><br>" +
                    "Starts with the <strong>Temple of Shai-Hulud</strong> building (grants +20% resource bonus)<br>" +
                    "All Spice Field locations are revealed on the map from turn 1<br>" +
                    "<strong>+0.5 Authority</strong> per active harvesting team per day<br>" +
                    "<strong>Active:</strong> Incite Rebellion in enemy villages tied to Landsraad resolution outcomes<br><br>" +
                    "<em>Best for:</em> Early economy and disrupting enemy villages",

                'Shimoom': "<strong>The Fremen</strong> &nbsp;|&nbsp; <em>Water-shaper &amp; desert economist</em><br><br>" +
                    "<strong>+Plascrete</strong> production from desert regions<br>" +
                    "<strong>-Upkeep</strong> cost for units operating in open desert<br>" +
                    "Water reserves generate passive Solari income<br><br>" +
                    "<em>Best for:</em> Sustaining large Fremen armies cheaply",

                'Jamis': "<strong>The Fremen</strong> &nbsp;|&nbsp; <em>Desert warrior &amp; liberator</em><br><br>" +
                    "<strong>-Authority</strong> cost to liberate occupied friendly villages<br>" +
                    "Units fighting <strong>outside friendly territory</strong> deal <strong>+damage</strong><br>" +
                    "Liberating villages grants bonus Authority<br><br>" +
                    "<em>Best for:</em> Offensive desert warfare and recapture strategies",

                'Stilgar Ben Fifrawi': "<strong>The Fremen</strong> &nbsp;|&nbsp; <em>Naib of Sietch Tabr</em><br><br>" +
                    "<strong>+1 Authority</strong> per day for each controlled region with a Spice Field<br>" +
                    "Controlled regions with Spice Fields grant <strong>-20% upkeep</strong> to themselves and adjacent regions<br>" +
                    "Improves sietch detection range<br><br>" +
                    "<em>Best for:</em> Spice-heavy maps and Authority-focused builds",

                'Chani Kynes': "<strong>The Fremen</strong> &nbsp;|&nbsp; <em>Stealth operative &amp; ambusher</em><br><br>" +
                    "<strong>+1 Intel</strong> per day for each adjacent neutral region<br>" +
                    "<strong>Active:</strong> Incite Rebellion â€” if the targeted Landsraad resolution passes, rebellions break out in enemy villages<br>" +
                    "Stealth units gain increased movement speed<br><br>" +
                    "<em>Best for:</em> Intel generation and Landsraad disruption",

                'Otheym': "<strong>The Fremen</strong> &nbsp;|&nbsp; <em>Fedaykin lieutenant &amp; combat aura</em><br><br>" +
                    "Nearby allied units gain <strong>+20% attack damage</strong><br>" +
                    "Nearby allied units take <strong>-20% damage received</strong><br>" +
                    "Boosts combat mobility for strike teams in the open desert<br><br>" +
                    "<em>Best for:</em> Aggressive military builds and combat-focused Fremen play",

                // â”€â”€ House Corrino â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                'Princess Irulan': "<strong>House Corrino</strong> &nbsp;|&nbsp; <em>Imperial scholar &amp; Landsraad master</em><br><br>" +
                    "<strong>Active:</strong> Cancel any active Landsraad resolution by spending Influence<br>" +
                    "Treaties imposed on other factions generate <strong>+Resources</strong> over time<br>" +
                    "Boosts Landsraad standing gained from passed resolutions<br><br>" +
                    "<em>Best for:</em> Landsraad control and diplomatic victory builds",

                'Reverend Mother Gaius Helen Mohiam': "<strong>House Corrino</strong> &nbsp;|&nbsp; <em>Bene Gesserit Truthsayer</em><br><br>" +
                    "<strong>Doubles</strong> charter vote power (your votes count twice)<br>" +
                    "Increases your Landsraad resolution priority<br>" +
                    "Enables Bene Gesserit political manipulation abilities<br><br>" +
                    "<em>Best for:</em> Dominating Landsraad resolutions and political wins",

                'Supreme Bashar Zum Garon': "<strong>House Corrino</strong> &nbsp;|&nbsp; <em>Sardaukar commander</em><br><br>" +
                    "<strong>Active:</strong> Arrange Truces that pause hostilities and extract tribute<br>" +
                    "Sardaukar units gain <strong>+Combat Power</strong> globally<br>" +
                    "<strong>Active:</strong> Mandate tribute payments from weaker factions<br><br>" +
                    "<em>Best for:</em> Military pressure and sustained Sardaukar armies",

                'Count Hasimir Fenring': "<strong>House Corrino</strong> &nbsp;|&nbsp; <em>Imperial assassin &amp; strategist</em><br><br>" +
                    "Extended scouting range â€” reveals more of the map early<br>" +
                    "<strong>-Agent recruitment time</strong> and bonus starting agent traits<br>" +
                    "Unlocks advanced tech tree entries earlier than normal<br><br>" +
                    "<em>Best for:</em> Early scouting, agent builds, and tech rushing",

                // â”€â”€ House Ecaz â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                'Ibbo Vipp': "<strong>House Ecaz</strong> &nbsp;|&nbsp; <em>Artist-soldier &amp; prestige builder</em><br><br>" +
                    "<strong>+Landsraad Standing</strong> for each Masterpiece created<br>" +
                    "Masterpieces held by Ibbo are protected by diplomatic immunity (cannot be targeted)<br>" +
                    "Unlocks unique Masterpiece types with higher standing bonuses<br><br>" +
                    "<em>Best for:</em> Landsraad-focused and prestige victory builds",

                'Rivvy Dinari': "<strong>House Ecaz</strong> &nbsp;|&nbsp; <em>Swordmaster &amp; veteran trainer</em><br><br>" +
                    "<strong>+Combat experience</strong> gain speed for all units<br>" +
                    "Veteran units (max rank) have <strong>no supply upkeep cost</strong><br>" +
                    "Unlocks advanced Champion training options<br><br>" +
                    "<em>Best for:</em> Long-game military builds with veteran unit snowball",

                'Sanya Ecaz': "<strong>House Ecaz</strong> &nbsp;|&nbsp; <em>Archduke's daughter &amp; Solari artist</em><br><br>" +
                    "Masterpieces generate <strong>+Solari</strong> income per day<br>" +
                    "Unlocks Sanctuary locations providing safe storage and income<br>" +
                    "<strong>+Influence</strong> from artistic exports and Landsraad gifts<br><br>" +
                    "<em>Best for:</em> Economic builds leveraging Masterpiece income",

                'Mesa Ecaz': "<strong>House Ecaz</strong> &nbsp;|&nbsp; <em>Territorial strategist</em><br><br>" +
                    "Masterpieces increase in value the more external territory you control<br>" +
                    "Abandoning a village refunds a portion of invested resources<br>" +
                    "Bonus Authority and Influence from holding distant outpost regions<br><br>" +
                    "<em>Best for:</em> Wide expansion and flexible territorial control"
            };
            return descriptions[cName] || '';
        }

        // Faction description helper for tooltips
        function getFactionDescription(faction) {
            switch (faction) {
                case 'Atreides':
                    return [
                        "Noble House specializing in diplomacy",
                        "and political control. Can peacefully",
                        "annex villages and force treaties."
                    ];
                case 'Harkonnen':
                    return [
                        "Brutal faction relying on oppression",
                        "and sacrifice. Can sacrifice agents for",
                        "bonuses and oppress villages for resources."
                    ];
                case 'Smugglers':
                    return [
                        "Underworld faction using stealth and",
                        "infiltration. Builds Underworld Headquarters",
                        "in enemy territory to siphon resources."
                    ];
                case 'Fremen':
                    return [
                        "Natives of Arrakis with superior desert",
                        "survival. Can ride sandworms and thrive",
                        "with high water-based economy."
                    ];
                case 'Corrino':
                    return [
                        "Imperial House ruling Arrakis. Deploys",
                        "massive bases, demands taxes, and dominates",
                        "the Landsraad using imperial authority."
                    ];
                case 'Ecaz':
                    return [
                        "Artsy and political house. Builds masterpieces",
                        "and sanctuaries to gain prestige, landsraad",
                        "standing, and military execution bonuses."
                    ];
                case 'Vernius':
                    return [
                        "Ixian house utilizing advanced technology.",
                        "Uses analytical nodes for developments and",
                        "deploys automated combat drones."
                    ];
                default:
                    return ["No description available."];
            }
        }

        // Player name helper
        function getPlayerName(userId) {
            if (!userId) return 'Unknown Player';
            const cleanId = userId.trim();
            
            // Generate a deterministic, thematic Dune-style username from the user ID
            let hash = 0;
            for (let i = 0; i < cleanId.length; i++) {
                hash = cleanId.charCodeAt(i) + ((hash << 5) - hash);
            }
            hash = Math.abs(hash);
            
            const titles = ['Na-Baron', 'Fedaykin', 'Mentat', 'Swordmaster', 'Sardaukar', 'Bashar', 'Warmaster', 'GuildNavigator', 'WaterSeller', 'SmugglerChief', 'NobleHouse', 'DesertFox', 'FreighterPilot'];
            const names = ['Arrakis', 'Caladan', 'GiediPrime', 'Salusa', 'Wallach', 'Ecaz', 'Vernius', 'Richese', 'Ix', 'Tupile', 'Arrakeen', 'Carthag', 'Sietch'];
            
            const title = titles[hash % titles.length];
            const name = names[Math.floor(hash / 7) % names.length];
            const suffix = hash % 100;
            
            return title + '_' + name + suffix;
        }

        // Victory condition helper
        // Victory condition helper
        function getVictoryCondition(g) {
            if (!g || !g.endReason) return 'Unknown';
            const tag = g.endReason.tag;
            if (tag === 'Supremacy') return 'Supremacy';
            if (tag === 'Hegemony') return 'Hegemony';
            if (tag === 'Economy') return 'Economy (CHOAM)';
            if (tag === 'Political') return 'Political (Governor)';
            if (tag === 'Objective') return 'Scenario Objective';
            return tag;
        }

        // Date formatting helper
        function formatDateStr(dateStr) {
            if (!dateStr) return 'Unknown';
            const parts = dateStr.split(' ')[0].split('-');
            if (parts.length !== 3) return dateStr;
            const year = parts[0];
            const monthIndex = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10).toString();
            const monthNames = [
                "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ];
            const monthName = monthNames[monthIndex] || parts[1];
            return day + ' - ' + monthName + ' - ' + year;
        }

        // Councilor name helper
        function getCouncilorName(cName) {
            if (!cName) return '-';
            const mappings = {
                'Jessica': 'Lady Jessica',
                'Duncan': 'Duncan Idaho',
                'Paul': 'Young Paul Atreides',
                'Yueh': 'Wellington Yueh',
                'Thufir': 'Thufir Hawat',
                'Piter': 'Piter de Vries',
                'Feyd': 'Feyd-Rautha Harkonnen',
                'Slavemaster': 'Cron Vatia',
                'Umman': 'Umman Kudu',
                'Bolig': 'Bolig Avati',
                'Lingar': 'Lingar Bewt',
                'Staban': 'Staban Tuek',
                'Lashon': 'Lashon Hara',
                'Stakkanov': 'Stakkanov',
                'Ramallo': 'Mother Ramallo',
                'Shimoom': 'Shimoom',
                'Jamis': 'Jamis',
                'Stilgar': 'Stilgar Ben Fifrawi',
                'Chani': 'Chani Kynes',
                'Otheym': 'Otheym',
                'Irulan': 'Princess Irulan',
                'Mohiam': 'Reverend Mother Gaius Helen Mohiam',
                'Zum': 'Supreme Bashar Zum Garon',
                'Fenring': 'Count Hasimir Fenring',
                'Ibbo': 'Ibbo Vipp',
                'Rivvy': 'Rivvy Dinari',
                'Bronso': 'Bronso Vernius',
                'Operative': 'Lashon Hara'
            };
            return mappings[cName] || cName;
        }

        // Faction icon helper
        function getFactionIcon(faction) {
            switch (faction) {
                case 'Atreides': return 'shield';
                case 'Harkonnen': return 'skull';
                case 'Smugglers': return 'package';
                case 'Fremen': return 'droplet';
                case 'Corrino': return 'crown';
                case 'Ecaz': return 'flower';
                case 'Vernius': return 'cpu';
                default: return 'help-circle';
            }
        }

        // Pagination & Sorting State
        let currentPage = 1;
        const rowsPerPage = 10;
        let filteredGamesList = [];
        let currentSortColumn = 'date';
        let currentSortDirection = 'desc';

        // Format duration helper
        function formatDuration(seconds) {
            if (!seconds) return '0m';
            const mins = Math.floor(seconds / 60);
            const secs = Math.round(seconds % 60);
            if (mins >= 60) {
                const hrs = Math.floor(mins / 60);
                const rm = mins % 60;
                return hrs + "h " + rm + "m";
            }
            return mins + "m " + secs + "s";
        }

        // Initialize elements
        document.addEventListener('DOMContentLoaded', () => {
            safeCreateIcons();
            
            // Check if preload is populated
            if (currentProfileData && currentProfileData.games) {
                renderDashboard(currentProfileData);
                document.getElementById('drop-zone').style.display = 'none';
            }

            // Setup Drag & Drop
            const dropZone = document.getElementById('drop-zone');
            
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('dragover');
            });

            dropZone.addEventListener('dragleave', () => {
                dropZone.classList.remove('dragover');
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file) {
                    processFile(file);
                }
            });

            dropZone.addEventListener('click', () => {
                document.getElementById('file-input').click();
            });

            document.getElementById('file-input').addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    processFile(file);
                }
            });

            // Setup Fullscreen Drag & Drop Overlay
            const overlay = document.getElementById('drop-zone-overlay');
            
            window.addEventListener('dragover', (e) => {
                e.preventDefault();
                overlay.classList.add('active');
            });

            overlay.addEventListener('dragleave', (e) => {
                overlay.classList.remove('active');
            });

            overlay.addEventListener('drop', (e) => {
                e.preventDefault();
                overlay.classList.remove('active');
                const file = e.dataTransfer.files[0];
                if (file) {
                    processFile(file);
                }
            });

            // Filters & Search listeners
            document.getElementById('filter-search').addEventListener('input', applyFilters);
            document.getElementById('filter-faction').addEventListener('change', applyFilters);
            document.getElementById('filter-outcome').addEventListener('change', applyFilters);

            // Modal listeners
            document.getElementById('close-modal-btn').addEventListener('click', () => {
                document.getElementById('detail-modal').classList.remove('active');
            });
            document.getElementById('detail-modal').addEventListener('click', (e) => {
                if (e.target === document.getElementById('detail-modal')) {
                    document.getElementById('detail-modal').classList.remove('active');
                }
            });
        });

        // Switch active mode (Multiplayer / Singleplayer / All)
        window.switchMode = function(mode) {
            activeMode = mode;
            
            // Update active class on buttons
            document.querySelectorAll('.mode-switcher .mode-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            if (mode === 'multi') document.getElementById('mode-multi').classList.add('active');
            else if (mode === 'single') document.getElementById('mode-single').classList.add('active');
            else if (mode === 'all') document.getElementById('mode-all').classList.add('active');

            if (currentProfileData && currentProfileData.games) {
                renderDashboard(currentProfileData);
            }
        };

        window.resetData = function() {
            // Reset to preloaded data
            currentProfileData = PRELOADED_DATA;
            
            // Hide dashboard and show drop zone
            document.getElementById('dashboard-content').style.display = 'none';
            document.getElementById('drop-zone').style.display = 'block';
            
            // Reset file input
            document.getElementById('file-input').value = '';
            
            // Reset active mode
            activeMode = 'multi';
            document.querySelectorAll('.mode-switcher .mode-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            document.getElementById('mode-multi').classList.add('active');
        };

        function processFile(file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const text = e.target.result.trim();
                    const unserializer = new HaxeUnserializer(text);
                    const parsed = unserializer.unserialize();
                    
                    if (!parsed.games) {
                        alert("File parsed, but no games matches found. Check if it's the correct profile_stats save.");
                        document.getElementById('file-input').value = '';
                        return;
                    }
                    
                    currentProfileData = parsed;
                    
                    // Reset mode selection to auto-detect if necessary
                    autoDetectMode(parsed.games);
                    
                    renderDashboard(parsed);
                    document.getElementById('drop-zone').style.display = 'none';
                    document.getElementById('file-input').value = '';
                } catch (err) {
                    console.error(err);
                    alert("Error unserializing file. Ensure it is a valid Haxe-serialized Dune: Spice Wars .sav file.");
                    document.getElementById('file-input').value = '';
                }
            };
            reader.onerror = function(e) {
                console.error("FileReader error:", reader.error);
                alert("Failed to read file: " + (reader.error ? reader.error.message : "Unknown error"));
                document.getElementById('file-input').value = '';
            };
            reader.readAsText(file);
        }

        // Auto detect active mode based on games in save file
        function autoDetectMode(games) {
            const multiCount = games.filter(g => g.isMulti === true).length;
            const singleCount = games.filter(g => g.isMulti === false).length;

            document.querySelectorAll('.mode-switcher .mode-btn').forEach(btn => {
                btn.classList.remove('active');
            });

            if (multiCount > 0) {
                activeMode = 'multi';
                document.getElementById('mode-multi').classList.add('active');
            } else if (singleCount > 0) {
                activeMode = 'single';
                document.getElementById('mode-single').classList.add('active');
            } else {
                activeMode = 'all';
                document.getElementById('mode-all').classList.add('active');
            }
        }

        // Render Dashboard Stats, Charts, Leaderboard, Table
        function renderDashboard(data) {
            document.getElementById('dashboard-content').style.display = 'block';

            const games = data.games || [];
            const conquest = data.conquest || [];

            // If first run, auto-detect activeMode based on preloaded games
            if (games.length > 0 && activeMode === 'multi' && games.filter(g => g.isMulti === true).length === 0) {
                autoDetectMode(games);
            }

            // Filter games based on current activeMode
            const activeGames = games.filter(g => {
                if (activeMode === 'multi') return g.isMulti === true;
                if (activeMode === 'single') return g.isMulti === false;
                return true;
            });

            // Card 1: Conquests
            const conquestCard = document.getElementById('card-conquest');
            if (conquestCard) {
                if (activeMode === 'multi') {
                    conquestCard.style.display = 'none';
                } else {
                    conquestCard.style.display = 'flex';
                }
            }
            document.getElementById('val-conquests').innerText = conquest.length;

            // Card 2: Total Playtime
            let totalSeconds = 0;
            let wins = 0;
            let soloGamesCount = 0;
            let teamGamesCount = 0;

            activeGames.forEach(g => {
                totalSeconds += g.currentTime || 0;
                if (g.isVictory) wins++;
                if (g.isTeamGame) teamGamesCount++;
                else soloGamesCount++;
            });

            const hrs = (totalSeconds / 3600).toFixed(1);
            document.getElementById('val-playtime').innerText = hrs + "h";

            // Card 3: Win rate & Total Games
            document.getElementById('val-total-games').innerText = activeGames.length;
            const winRate = activeGames.length > 0 ? ((wins / activeGames.length) * 100).toFixed(1) : 0;
            document.getElementById('val-winrate').innerText = winRate + "%";

            // Card 4: Solo / Team Split
            document.getElementById('val-match-type-split').innerText = soloGamesCount + " / " + teamGamesCount;

            // Process Charts
            renderCharts(activeGames);

            // Process Leaderboard
            renderLeaderboard(activeGames);

            // Process Table list
            applyFilters();
        }

        function renderCharts(activeGames) {
            const factionCounts = {};
            const endReasons = {};

            activeGames.forEach(g => {
                factionCounts[g.faction] = (factionCounts[g.faction] || 0) + 1;
                
                let reason = 'Abandoned / Incomplete';
                if (g.endReason && g.endReason.tag) {
                    const tag = g.endReason.tag;
                    if (tag === 'Supremacy') reason = 'Supremacy';
                    else if (tag === 'Hegemony') reason = 'Hegemony';
                    else if (tag === 'Economy') reason = 'Economy (CHOAM)';
                    else if (tag === 'Political') reason = 'Political (Governor)';
                    else if (tag === 'Objective') reason = 'Scenario Objective';
                    else reason = tag;
                }
                endReasons[reason] = (endReasons[reason] || 0) + 1;
            });

            // Chart 1: Faction Games Count
            const factionLabels = Object.keys(factionCounts);
            const factionData = Object.values(factionCounts);
            const factionColors = factionLabels.map(f => getFactionColor(f));

            if (chartGamesInstance) chartGamesInstance.destroy();
            const ctx1 = document.getElementById('chart-faction-games').getContext('2d');
            chartGamesInstance = new Chart(ctx1, {
                type: 'bar',
                data: {
                    labels: factionLabels,
                    datasets: [{
                        label: 'Games Played',
                        data: factionData,
                        backgroundColor: factionColors,
                        borderWidth: 0,
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                footer: function(tooltipItems) {
                                    const label = tooltipItems[0].label;
                                    return getFactionDescription(label).join('\n');
                                }
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#9590a2' }
                        },
                        x: {
                            grid: { display: false },
                            ticks: {
                                color: function(context) {
                                    const label = context.chart.data.labels[context.index];
                                    return getFactionColor(label);
                                },
                                font: {
                                    weight: 'bold',
                                    family: 'Outfit'
                                }
                            }
                        }
                    }
                }
            });

            // Chart 2: End Reasons (Doughnut)
            const reasonLabels = Object.keys(endReasons);
            const reasonData = Object.values(endReasons);
            const chartColors = [
                '#c98a41', '#e29578', '#a8dadc', '#457b9d', '#1d3557', '#ffb703', '#fb8500'
            ];

            if (chartReasonsInstance) chartReasonsInstance.destroy();
            const ctx2 = document.getElementById('chart-end-reasons').getContext('2d');
            chartReasonsInstance = new Chart(ctx2, {
                type: 'doughnut',
                data: {
                    labels: reasonLabels,
                    datasets: [{
                        data: reasonData,
                        backgroundColor: chartColors,
                        borderColor: '#110f17',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#f0edf5',
                                font: { family: 'Outfit', size: 10 }
                            }
                        }
                    }
                }
            });
        }

        function renderLeaderboard(activeGames) {
            const factionStats = {};
            activeGames.forEach(g => {
                const f = g.faction;
                if (!factionStats[f]) {
                    factionStats[f] = { played: 0, wins: 0, losses: 0, totalTime: 0 };
                }
                factionStats[f].played++;
                if (g.isVictory) factionStats[f].wins++;
                else factionStats[f].losses++;
                factionStats[f].totalTime += g.currentTime || 0;
            });

            const leaderboard = document.getElementById('faction-leaderboard');
            leaderboard.innerHTML = '';

            const sortedFactions = Object.keys(factionStats).sort((a, b) => factionStats[b].played - factionStats[a].played);

            if (sortedFactions.length === 0) {
                leaderboard.innerHTML = '<div style="text-align: center; color: var(--text-muted); padding: 20px;">No matches found for this mode.</div>';
                return;
            }

            sortedFactions.forEach(f => {
                const stats = factionStats[f];
                const wr = stats.played > 0 ? (stats.wins / stats.played * 100).toFixed(0) : 0;
                const avgMins = stats.played > 0 ? (stats.totalTime / stats.played / 60).toFixed(0) : 0;
                const color = getFactionColor(f);

                const itemWrapper = document.createElement('div');
                itemWrapper.className = 'faction-leaderboard-item';

                const row = document.createElement('div');
                row.className = 'faction-rank-row';
                row.innerHTML = 
                    '<div class="faction-name-block">' +
                        '<div class="faction-pill" style="background: ' + color + '; box-shadow: 0 0 10px ' + color + ';"></div>' +
                        '<span class="rank-faction-name">' + f + '</span>' +
                    '</div>' +
                    '<div class="faction-perf-block">' +
                        '<span class="faction-stats-text">Avg: ' + avgMins + 'm</span>' +
                        '<div class="faction-winrate-bar-container">' +
                            '<div class="faction-winrate-bar" style="width: ' + wr + '%; background: ' + color + ';"></div>' +
                        '</div>' +
                        '<span class="faction-stats-text" style="font-weight: bold; color: ' + (stats.wins > 0 ? '#2ecc71' : 'var(--text-muted)') + '">' + wr + '% WR</span>' +
                        '<span class="faction-stats-text" style="color: var(--text-main)">' + stats.played + ' matches</span>' +
                        '<i data-lucide="chevron-down" class="expansion-chevron" style="width: 16px; height: 16px; transition: transform 0.3s ease; color: var(--text-muted); margin-left: 8px;"></i>' +
                    '</div>';

                // Calculate Hero and Councilor stats for this faction
                const factionGames = activeGames.filter(g => g.faction === f);
                const heroStats = {};
                const councilorStats = {};

                factionGames.forEach(g => {
                    // Hero â€” store heroId + faction for tooltip lookup
                    const hName = getHeroName(g.hero, g.faction);
                    if (hName && hName !== '-') {
                        if (!heroStats[hName]) heroStats[hName] = { played: 0, wins: 0, heroId: g.hero, faction: g.faction };
                        heroStats[hName].played++;
                        if (g.isVictory) heroStats[hName].wins++;
                    }
                    
                    // Councilors
                    const councilors = g.councilors || [];
                    councilors.forEach(c => {
                        const cName = getCouncilorName(c);
                        if (cName && cName !== '-') {
                            if (!councilorStats[cName]) councilorStats[cName] = { played: 0, wins: 0 };
                            councilorStats[cName].played++;
                            if (g.isVictory) councilorStats[cName].wins++;
                        }
                    });
                });

                // Generate HTML for Heroes
                let heroesHtml = '';
                const sortedHeroes = Object.keys(heroStats).sort((a, b) => heroStats[b].played - heroStats[a].played);
                if (sortedHeroes.length === 0) {
                    heroesHtml = '<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; padding: 4px 0;">No heroes deployed.</div>';
                } else {
                    heroesHtml = '<div class="expansion-list">' +
                        sortedHeroes.map(h => {
                            const hs = heroStats[h];
                            const wr = hs.played > 0 ? (hs.wins / hs.played * 100).toFixed(0) : 0;
                            const desc = getHeroDescription(hs.heroId, hs.faction);
                            return '<div class="expansion-item tooltip-cell">' +
                                '<span class="expansion-item-name">' + h + '</span>' +
                                '<span class="expansion-item-stats">' + hs.played + ' matches (' + wr + '% WR)</span>' +
                                (desc ? '<span class="tooltip-text">' + desc + '</span>' : '') +
                            '</div>';
                        }).join('') +
                    '</div>';
                }

                // Generate HTML for Councilors
                let councilorsHtml = '';
                const sortedCouncilors = Object.keys(councilorStats).sort((a, b) => councilorStats[b].played - councilorStats[a].played);
                if (sortedCouncilors.length === 0) {
                    councilorsHtml = '<div style="font-size: 0.85rem; color: var(--text-muted); font-style: italic; padding: 4px 0;">No councilors selected.</div>';
                } else {
                    councilorsHtml = '<div class="expansion-list">' +
                        sortedCouncilors.map(c => {
                            const cs = councilorStats[c];
                            const wr = cs.played > 0 ? (cs.wins / cs.played * 100).toFixed(0) : 0;
                            const desc = getCouncillorDescription(c);
                            return '<div class="expansion-item">' +
                                '<span class="expansion-item-name">' + c + '</span>' +
                                '<span class="expansion-item-stats">' + cs.played + ' matches (' + wr + '% WR)</span>' +
                                (desc ? '<span class="tooltip-text">' + desc + '</span>' : '') +
                            '</div>';
                        }).join('') +
                    '</div>';
                }

                const expansion = document.createElement('div');
                expansion.className = 'faction-rank-expansion';
                expansion.innerHTML = 
                    '<div class="expansion-grid">' +
                        '<div>' +
                            '<div class="expansion-section-title">Heroes Stats</div>' +
                            heroesHtml +
                        '</div>' +
                        '<div>' +
                            '<div class="expansion-section-title">Councilors Stats</div>' +
                            councilorsHtml +
                        '</div>' +
                    '</div>';

                itemWrapper.appendChild(row);
                itemWrapper.appendChild(expansion);

                row.addEventListener('click', () => {
                    const isActive = itemWrapper.classList.contains('active');
                    
                    // Collapse all leaderboard items
                    document.querySelectorAll('.faction-leaderboard-item').forEach(item => {
                        item.classList.remove('active');
                    });
                    
                    // Toggle the clicked one
                    if (!isActive) {
                        itemWrapper.classList.add('active');
                    }
                });

                leaderboard.appendChild(itemWrapper);
            });
            safeCreateIcons();
        }

        // Apply Search & Filters to Games Array
        function applyFilters() {
            updateSortIndicators();
            const query = document.getElementById('filter-search').value.toLowerCase();
            const faction = document.getElementById('filter-faction').value;
            const outcome = document.getElementById('filter-outcome').value;

            const games = currentProfileData.games || [];
            
            // Filter by activeMode (multi / single / all)
            const modeFilteredGames = games.filter(g => {
                if (activeMode === 'multi') return g.isMulti === true;
                if (activeMode === 'single') return g.isMulti === false;
                return true;
            });

            filteredGamesList = modeFilteredGames.filter(g => {
                const mappedCouncilors = (g.councilors || []).map(getCouncilorName);
                const councilorsStr = mappedCouncilors.join(' ').toLowerCase() + ' ' + (g.councilors || []).join(' ').toLowerCase();
                const heroStr = (g.hero || '').toLowerCase();
                const readableHeroStr = getHeroName(g.hero, g.faction).toLowerCase();
                const dateStr = (g.realDateStr || '').toLowerCase() + ' ' + formatDateStr(g.realDateStr).toLowerCase();
                const userIdStr = (g.userId || '').toLowerCase();
                const readablePlayerStr = getPlayerName(g.userId).toLowerCase();
                
                const matchesSearch = !query || 
                    councilorsStr.includes(query) || 
                    heroStr.includes(query) || 
                    readableHeroStr.includes(query) ||
                    dateStr.includes(query) ||
                    userIdStr.includes(query) ||
                    readablePlayerStr.includes(query);

                const matchesFaction = !faction || g.faction === faction;

                const isVictory = g.isVictory;
                const matchesOutcome = !outcome || 
                    (outcome === 'victory' && isVictory) || 
                    (outcome === 'defeat' && !isVictory);

                return matchesSearch && matchesFaction && matchesOutcome;
            });

            // Sort filteredGamesList
            filteredGamesList.sort((a, b) => {
                let valA, valB;
                switch (currentSortColumn) {
                    case 'date':
                        valA = a.realDate || 0;
                        valB = b.realDate || 0;
                        break;
                    case 'faction':
                        valA = a.faction || '';
                        valB = b.faction || '';
                        break;
                    case 'outcome':
                        valA = a.isVictory ? 1 : 0;
                        valB = b.isVictory ? 1 : 0;
                        break;
                    case 'victoryCondition':
                        valA = getVictoryCondition(a);
                        valB = getVictoryCondition(b);
                        break;
                    case 'matchFormat':
                        valA = a.isTeamGame ? 1 : 0;
                        valB = b.isTeamGame ? 1 : 0;
                        break;
                    case 'hero':
                        valA = getHeroName(a.hero, a.faction);
                        valB = getHeroName(b.hero, b.faction);
                        break;
                    case 'duration':
                        valA = a.currentTime || 0;
                        valB = b.currentTime || 0;
                        break;
                    case 'deaths':
                        valA = (a.stats ? (a.stats.DeathByWorm || 0) + (a.stats.DeathBySupply || 0) : 0);
                        valB = (b.stats ? (b.stats.DeathByWorm || 0) + (b.stats.DeathBySupply || 0) : 0);
                        break;
                    default:
                        valA = a.realDate || 0;
                        valB = b.realDate || 0;
                }

                if (valA === valB) return 0;
                
                let comparison = 0;
                if (typeof valA === 'string') {
                    comparison = valA.localeCompare(valB);
                } else {
                    comparison = valA < valB ? -1 : 1;
                }
                
                return currentSortDirection === 'asc' ? comparison : -comparison;
            });

            currentPage = 1;
            renderTable();
        }

        function handleSort(column) {
            if (currentSortColumn === column) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortColumn = column;
                currentSortDirection = (column === 'date' || column === 'duration' || column === 'deaths') ? 'desc' : 'asc';
            }
            updateSortIndicators();
            applyFilters();
        }

        function updateSortIndicators() {
            const columns = ['date', 'faction', 'outcome', 'victoryCondition', 'matchFormat', 'hero', 'duration', 'deaths'];
            columns.forEach(col => {
                const el = document.getElementById('sort-icon-' + col);
                if (el) {
                    if (currentSortColumn === col) {
                        el.innerHTML = currentSortDirection === 'asc' ? ' â–²' : ' â–¼';
                        el.style.color = 'var(--accent-gold)';
                    } else {
                        el.innerHTML = '';
                    }
                }
            });
        }

        // Render Table & Pagination
        function renderTable() {
            const tbody = document.getElementById('games-tbody');
            tbody.innerHTML = '';

            const startIdx = (currentPage - 1) * rowsPerPage;
            const endIdx = Math.min(startIdx + rowsPerPage, filteredGamesList.length);

            const displayList = filteredGamesList.slice(startIdx, endIdx);

            if (displayList.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 30px;">No games match the current filters.</td></tr>';
                document.getElementById('table-showing-info').innerText = 'Showing 0 to 0 of 0 games';
                renderPagination(0);
                return;
            }

            displayList.forEach((g, index) => {
                const globalIdx = startIdx + index;
                const row = document.createElement('tr');
                row.addEventListener('click', () => showGameDetails(g));

                const outcomeClass = g.isVictory ? 'outcome-victory' : 'outcome-defeat';
                const outcomeText = g.isVictory ? 'Victory' : 'Defeat';

                const wormDeaths = g.stats ? (g.stats.DeathByWorm || 0) : 0;
                const splyDeaths = g.stats ? (g.stats.DeathBySupply || 0) : 0;

                const dateClean = formatDateStr(g.realDateStr);
                const formatLabel = g.isTeamGame ? 'Team Game' : 'Solo';

                const factionIcon = getFactionIcon(g.faction);
                const factionColor = getFactionColor(g.faction);
                const heroName = getHeroName(g.hero, g.faction);

                const factionHtml = '<div style="display: flex; align-items: center; gap: 6px; font-weight: 600; color: ' + factionColor + ';">' +
                    '<i data-lucide="' + factionIcon + '" style="width: 14px; height: 14px;"></i>' +
                    '<span>' + g.faction + '</span>' +
                '</div>';

                const heroDesc = getHeroDescription(g.hero, g.faction);
                const heroHtml = heroName === '-' ? '-' : 
                    '<div class="hero-cell">' +
                        '<i data-lucide="swords" style="width: 14px; height: 14px; color: var(--accent-spice);"></i>' +
                        '<span>' + heroName + '</span>' +
                        (heroDesc ? '<span class="tooltip-text">' + heroDesc + '</span>' : '') +
                    '</div>';

                const playerHtml = '<div style="display: flex; align-items: center; gap: 6px; font-family: sans-serif;">' +
                    '<i data-lucide="user" style="width: 14px; height: 14px; color: var(--text-muted);"></i>' +
                    '<span>' + getPlayerName(g.userId) + '</span>' +
                '</div>';

                const winnerHtml = g.isVictory ? 
                    '<span style="font-weight: 600; color: #2ecc71; display: flex; align-items: center; gap: 4px;"><i data-lucide="trophy" style="width: 14px; height: 14px;"></i>' + getPlayerName(g.userId) + '</span>' : 
                    '<span style="color: var(--text-muted); font-style: italic;">Opponent</span>';

                row.innerHTML = 
                    '<td>' + dateClean + '</td>' +
                    '<td>' + factionHtml + '</td>' +
                    '<td><span class="outcome-badge ' + outcomeClass + '">' + outcomeText + '</span></td>' +
                    '<td>' + getVictoryCondition(g) + '</td>' +
                    '<td>' + formatLabel + '</td>' +
                    '<td>' + heroHtml + '</td>' +
                    '<td>' + formatDuration(g.currentTime) + '</td>' +
                    '<td style="color: var(--text-muted); cursor: help;" title="Deaths breakdown: ' + wormDeaths + ' devoured by Sandworms, ' + splyDeaths + ' lost to dehydration (lack of supply)">' + wormDeaths + ' / ' + splyDeaths + '</td>';

                tbody.appendChild(row);
            });

            document.getElementById('table-showing-info').innerText = "Showing " + (startIdx + 1) + " to " + endIdx + " of " + filteredGamesList.length + " games";
            renderPagination(filteredGamesList.length);
        }

        // Render pagination controls
        function renderPagination(totalCount) {
            const container = document.getElementById('table-pagination');
            container.innerHTML = '';

            const pageCount = Math.ceil(totalCount / rowsPerPage);
            if (pageCount <= 1) return;

            // Prev Button
            const prevBtn = document.createElement('button');
            prevBtn.className = 'page-btn';
            prevBtn.innerHTML = '<i data-lucide="chevron-left" style="width: 16px; height: 16px;"></i>';
            prevBtn.disabled = currentPage === 1;
            prevBtn.addEventListener('click', () => {
                if (currentPage > 1) {
                    currentPage--;
                    renderTable();
                }
            });
            container.appendChild(prevBtn);

            // Page numbers
            for (let i = 1; i <= pageCount; i++) {
                if (pageCount > 5 && Math.abs(currentPage - i) > 2 && i !== 1 && i !== pageCount) {
                    if (i === 2 || i === pageCount - 1) {
                        const dots = document.createElement('span');
                        dots.innerText = '...';
                        dots.style.padding = '0 5px';
                        container.appendChild(dots);
                    }
                    continue;
                }

                const pageBtn = document.createElement('button');
                pageBtn.className = "page-btn " + (currentPage === i ? 'active' : '');
                pageBtn.innerText = i;
                pageBtn.addEventListener('click', () => {
                    currentPage = i;
                    renderTable();
                });
                container.appendChild(pageBtn);
            }

            // Next Button
            const nextBtn = document.createElement('button');
            nextBtn.className = 'page-btn';
            nextBtn.innerHTML = '<i data-lucide="chevron-right" style="width: 16px; height: 16px;"></i>';
            nextBtn.disabled = currentPage === pageCount;
            nextBtn.addEventListener('click', () => {
                if (currentPage < pageCount) {
                    currentPage++;
                    renderTable();
                }
            });
            container.appendChild(nextBtn);
            safeCreateIcons();
        }

        // Show game detail modal
        function showGameDetails(g) {
            const modal = document.getElementById('detail-modal');
            
            const factionIcon = getFactionIcon(g.faction);
            document.getElementById('modal-title-faction').innerHTML = 
                '<i data-lucide="' + factionIcon + '" style="width: 22px; height: 22px; display: inline-block; vertical-align: middle; margin-right: 8px;"></i>' +
                '<span>' + g.faction + ' Match Profile</span>';
            document.getElementById('modal-title-faction').style.color = getFactionColor(g.faction);
            document.getElementById('modal-title-date').innerText = formatDateStr(g.realDateStr);

            const outcomeText = g.isVictory ? 'Victory' : 'Defeat';
            const outcomeVal = document.getElementById('modal-val-outcome');
            outcomeVal.innerText = outcomeText;
            outcomeVal.className = 'detail-value ' + (g.isVictory ? 'outcome-badge outcome-victory' : 'outcome-badge outcome-defeat');

            const winnerText = g.isVictory ? 
                '<span style="font-weight: 600; color: #2ecc71; display: inline-flex; align-items: center; gap: 4px;"><i data-lucide="trophy" style="width: 14px; height: 14px;"></i>' + getPlayerName(g.userId) + ' (' + g.faction + ')</span>' : 
                '<span style="color: var(--text-muted); font-style: italic;">Opponent</span>';
            document.getElementById('modal-val-winner').innerHTML = winnerText;

            let reasonText = 'Abandoned / Incomplete';
            if (g.endReason && g.endReason.tag) {
                const tag = g.endReason.tag;
                if (tag === 'Supremacy') reasonText = 'Supremacy Victory';
                else if (tag === 'Hegemony') reasonText = 'Hegemony Victory';
                else if (tag === 'Economy') reasonText = 'Economy (CHOAM) Victory';
                else if (tag === 'Political') reasonText = 'Political (Governor) Victory';
                else if (tag === 'Objective') reasonText = 'Scenario Objective Completed';
                else reasonText = tag;
            }
            document.getElementById('modal-val-reason').innerText = reasonText;
            
            const readableHero = getHeroName(g.hero, g.faction);
            const heroDesc = getHeroDescription(g.hero, g.faction);
            if (readableHero === '-') {
                document.getElementById('modal-val-hero').innerText = 'None Selected';
            } else {
                document.getElementById('modal-val-hero').innerHTML = 
                    '<div class="hero-cell">' +
                        '<i data-lucide="swords" style="width: 14px; height: 14px; color: var(--accent-spice);"></i>' +
                        '<span>' + readableHero + '</span>' +
                        (heroDesc ? '<span class="tooltip-text">' + heroDesc + '</span>' : '') +
                    '</div>';
            }

            if (g.councilors && g.councilors.length > 0) {
                const councilorHtml = g.councilors.map(c => {
                    const fullName = getCouncilorName(c);
                    const desc = getCouncillorDescription(fullName);
                    return '<span class="tooltip-cell" style="display: inline-flex; align-items: center; gap: 4px; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; margin-right: 6px; border: 1px solid rgba(255,255,255,0.1);">' +
                        '<i data-lucide="user" style="width: 12px; height: 12px; color: var(--text-muted);"></i>' +
                        '<span>' + fullName + '</span>' +
                        (desc ? '<span class="tooltip-text">' + desc + '</span>' : '') +
                    '</span>';
                }).join('');
                document.getElementById('modal-val-councilors').innerHTML = councilorHtml;
            } else {
                document.getElementById('modal-val-councilors').innerText = 'None';
            }

            document.getElementById('modal-val-duration').innerText = formatDuration(g.currentTime);
            document.getElementById('modal-val-difficulty').innerText = g.difficulty !== undefined ? g.difficulty : '-';

            const wormDeaths = g.stats ? (g.stats.DeathByWorm || 0) : 0;
            const splyDeaths = g.stats ? (g.stats.DeathBySupply || 0) : 0;
            document.getElementById('modal-val-worms').innerText = wormDeaths;
            document.getElementById('modal-val-supply').innerText = splyDeaths;

            // Render Operations list
            const opsContainer = document.getElementById('modal-val-ops');
            opsContainer.innerHTML = '';
            
            const ops = g.stats ? g.stats.OperationUsed : null;
            if (ops && ops.length > 0) {
                const opsCounts = {};
                ops.forEach(op => {
                    opsCounts[op] = (opsCounts[op] || 0) + 1;
                });

                Object.keys(opsCounts).forEach(op => {
                    const badge = document.createElement('span');
                    badge.className = 'op-badge';
                    const count = opsCounts[op];
                    badge.innerText = count > 1 ? op + " (x" + count + ")" : op;
                    opsContainer.appendChild(badge);
                });
            } else {
                opsContainer.innerHTML = '<span style="color: var(--text-muted);">No operations recorded in this match.</span>';
            }

            modal.classList.add('active');
            safeCreateIcons();
        }
    
