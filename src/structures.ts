import { Channel, User } from "discord.js";
import moment from "moment-timezone";

export enum GameName {
    SPLASH3 = 'splash3',
    REVOLUTION = 'revolution',
    HUE2 = 'hue2',
    SPLASH4 = 'splash4',
    PARTITION = 'partition',
    FRONTIER = 'frontier'
}

export enum TeamName {
    BLUE = 'blue',
    RED = 'red',
    GREEN = 'green',
    YELLOW = 'yellow',
    PURPLE = 'purple',
    ORANGE = 'orange'
}

export enum PieceName {
    LEADER = 'leader',
    COLORER = 'colorer',
    CAR = 'car',
    PAINTER = 'painter',
    OVERLORD = 'overlord',
    BUCKETEER = 'bucketeer',
    MEDIC = 'medic',
    SHOOTER = 'shooter',
}

export enum Cooldown {
    ACTION = 'action',
    STUNNED = 'stunned',
    IMMUNITY = 'immunity',
}

export type PlayerStatistics = {
    joinedDate: moment.Moment;
    lastDate: moment.Moment;
    gamesPlayed: number;
    gamesWon: number;
    actionsTaken: number;
    abilitiesUsed: number;
}

export type PlayerInfo = {
    displayName: string | null;
    cooldownPing: boolean;
    statistics: PlayerStatistics;
}

export type Shade = 0 | 1 | 2 | 3;

export type GridInfo = {
    x: number;
    y: number;
    i: Shade;
}

export type GridData = GridInfo & {
    team: TeamName | null;
}

export type Cooldowns = {
    [key in Cooldown]?: number
}

export type StunOptions = {
    stunTime: number;
}

export type ShootOptions = {
    range: number;
    strength?: number;
    splash?: boolean;
}

export type MoveOptions = {
    diag?: boolean;
    speed?: number;
    strength?: number;
    immobile?: boolean;
}

export type PieceAbility = {
    displayName: string;
    cooldownMultiplier?: number;
    stun?: StunOptions;
    move?: MoveOptions;
    shoot?: ShootOptions;
    splash?: boolean;
    teleport?: number;
    bucket?: boolean;
    heal?: boolean;
}

export type PieceInfo = {
    name: PieceName;
    pos: {x: number, y: number};
}

export type PieceData = PieceInfo & {
    team: TeamName;
    owner: User | null;
    abilities: PieceAbility;
    cooldowns: Cooldowns;
    consecutiveStuns: number;
}

export type GameInfo = {
    name: string;
    win: number | null;
    nplayers: number;
    gridSize: [number, number];
    teams: {
        [key in TeamName]?: {
            pieces: PieceInfo[],
            grid: GridInfo[]
        }
    };
    paritions?: [number, number];
}

export type TeamInfo = {
    emoji: string;
    shades: `#${string}`[];
}

export type Data = {
    gameTypes: {
        [key in GameName]: GameInfo;
    }
    pieceTypes: {
        [key in PieceName]: PieceAbility;
    }
    teamTypes: {
        [key in TeamName]: TeamInfo;
    }
}

export type GameData = {
    signups: boolean;
    pieces: PieceData[];
    grid: GridData[];
    cooldown: number;
    started: number | null;
}

export type GuildData = {
    channel: Channel | null;
    info: GameInfo | null;
    game: GameData;
    active: boolean;
}

export const data: Data = {
    gameTypes: {
        splash3: {
            name: "splash3",
            win: 61,
            nplayers: 9,
            gridSize: [11, 11],
            teams: {
                blue: {
                    pieces: [ 
                        {
                            name: PieceName.LEADER,
                            pos: {x: 2, y: 0}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 0, y: 0}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 4, y: 0}
                        }
                    ],
                    grid: [
                        {x:0, y:0, i:1},
                        {x:1, y:0, i:2},
                        {x:2, y:0, i:3},
                        {x:3, y:0, i:2},
                        {x:4, y:0, i:1},
                        {x:1, y:1, i:1},
                        {x:2, y:1, i:2},
                        {x:3, y:1, i:1},
                        {x:2, y:2, i:1}
                    ]
                },
                red: {
                    pieces: [
                        {
                            name: PieceName.LEADER,
                            pos: {x: 2, y: 10}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 0, y: 10}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 4, y: 10}
                        }
                    ],
                    grid: [
                        {x:0, y:10, i:1},
                        {x:1, y:10, i:2},
                        {x:2, y:10, i:3},
                        {x:3, y:10, i:2},
                        {x:4, y:10, i:1},
                        {x:1, y:9, i:1},
                        {x:2, y:9, i:2},
                        {x:3, y:9, i:1},
                        {x:2, y:8, i:1}
                    ]
                },
                green: {
                    pieces: [
                        {
                            name: PieceName.LEADER,
                            pos: {x: 10, y: 5}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 10, y: 3}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 10, y: 7}
                        }
                    ],
                    grid: [
                        {x:10, y:3, i:1},
                        {x:10, y:4, i:2},
                        {x:10, y:5, i:3},
                        {x:10, y:6, i:2},
                        {x:10, y:7, i:1},
                        {x:9, y:4, i:1},
                        {x:9, y:5, i:2},
                        {x:9, y:6, i:1},
                        {x:8, y:5, i:1}
                    ]
                } 
            }
        },
        revolution: {
            name: "revolution",
            win: 81,
            nplayers: 6,
            gridSize: [11, 11],
            teams: {
                blue: {
                    pieces: [
                        {
                            name: PieceName.LEADER,
                            pos: {x: 1, y: 0}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 1, y: 1}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 0, y: 1}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 2, y: 2}
                        }
                    ],
                    grid: [
                        {x:0, y:0, i:1},
                        {x:1, y:0, i:2},
                        {x:2, y:0, i:3},
                        {x:0, y:1, i:2},
                        {x:1, y:1, i:2},
                        {x:2, y:1, i:3},
                        {x:0, y:2, i:3},
                        {x:1, y:2, i:3},
                        {x:2, y:2, i:3},
                        {x:10, y:7, i:1},
                        {x:8, y:7, i:1},
                        {x:7, y:10, i:1},
                        {x:7, y:8, i:1}
                    ]
                },
                red: {
                    pieces: [
                        {
                            name: PieceName.LEADER,
                            pos: {x: 9, y: 8}
                        },
                        {
                            name: PieceName.CAR,
                            pos: {x: 8, y: 9}
                        }
                    ],
                    grid: [
                        {x:10, y:10, i:1},
                        {x:10, y:9, i:1},
                        {x:9, y:10, i:1},
                        {x:7, y:7, i:1},
                        {x:8, y:10, i:2},
                        {x:10, y:8, i:2},
                        {x:9, y:9, i:2},
                        {x:8, y:8, i:2},
                        {x:9, y:7, i:2},
                        {x:7, y:9, i:2},
                        {x:8, y:9, i:3},
                        {x:9, y:8, i:3},
                    ]
                },
            }
        },
        hue2: {
            name: "hue2",
            win: 81,
            nplayers: 8,
            gridSize: [11, 11],
            teams: {
                blue: {
                    pieces: [
                        {
                            name: PieceName.LEADER,
                            pos: {x: 2, y: 9}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 1, y: 9}
                        },
                        {
                            name: PieceName.PAINTER,
                            pos: {x: 0, y: 9}
                        },
                        {
                            name: PieceName.CAR,
                            pos: {x: 2, y: 10}
                        },
                    ],
                    grid: [
                        {x:0, y:10, i:3},
                        {x:1, y:10, i:3},
                        {x:2, y:10, i:2},
                        {x:2, y:9, i:2},
                        {x:1, y:9, i:2},
                        {x:0, y:9, i:2},
                        {x:0, y:8, i:1},
                        {x:1, y:8, i:1},
                        {x:2, y:8, i:1},
                        {x:3, y:8, i:1},
                        {x:3, y:9, i:1},
                        {x:3, y:10, i:1},
                    ]
                },
                red: {
                    pieces: [
                        {
                            name: PieceName.LEADER,
                            pos: {x: 8, y: 1}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 9, y: 1}
                        },
                        {
                            name: PieceName.PAINTER,
                            pos: {x: 10, y: 1}
                        },
                        {
                            name: PieceName.CAR,
                            pos: {x: 8, y: 0}
                        },
                    ],
                    grid: [
                        {x:10, y:0, i:3},
                        {x:9, y:0, i:3},
                        {x:8, y:0, i:2},
                        {x:8, y:1, i:2},
                        {x:9, y:1, i:2},
                        {x:10, y:1, i:2},
                        {x:10, y:2, i:1},
                        {x:9, y:2, i:1},
                        {x:8, y:2, i:1},
                        {x:7, y:2, i:1},
                        {x:7, y:1, i:1},
                        {x:7, y:0, i:1},
                    ]
                },
            }
        },
        splash4: {
            name: "splash4",
            win: 51,
            nplayers: 12,
            gridSize: [11, 11],
            teams: {
                blue: {
                    pieces: [ 
                        {
                            name: PieceName.LEADER,
                            pos: {x: 1, y: 1}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 2, y: 0}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 0, y: 2}
                        }
                    ],
                    grid: [
                        {x:0, y:0, i:3},
                        {x:1, y:0, i:2},
                        {x:0, y:1, i:2},
                        {x:2, y:0, i:1},
                        {x:1, y:1, i:1},
                        {x:0, y:2, i:1},
                    ]
                },
                red: {
                    pieces: [
                        {
                            name: PieceName.LEADER,
                            pos: {x: 1, y: 9}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 0, y: 8}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 2, y: 10}
                        }
                    ],
                    grid: [
                        {x:0, y:10, i:3},
                        {x:1, y:10, i:2},
                        {x:0, y:9, i:2},
                        {x:2, y:10, i:1},
                        {x:1, y:9, i:1},
                        {x:0, y:8, i:1},
                    ]
                },
                green: {
                    pieces: [
                        {
                            name: PieceName.LEADER,
                            pos: {x: 9, y: 1}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 8, y: 0}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 10, y: 2}
                        }
                    ],
                    grid: [
                        {x:10, y:0, i:3},
                        {x:9, y:0, i:2},
                        {x:10, y:1, i:2},
                        {x:8, y:0, i:1},
                        {x:9, y:1, i:1},
                        {x:10, y:2, i:1},
                    ]
                },
                yellow: {
                    pieces: [
                        {
                            name: PieceName.LEADER,
                            pos: {x: 9, y: 9}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 10, y: 8}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 8, y: 10}
                        }
                    ],
                    grid: [
                        {x:10, y:10, i:3},
                        {x:9, y:10, i:2},
                        {x:10, y:9, i:2},
                        {x:8, y:10, i:1},
                        {x:9, y:9, i:1},
                        {x:10, y:8, i:1},
                    ]
                }
            }
        },
        partition: {
            name: "partition",
            win: null,
            nplayers: 12,
            gridSize: [12, 12],
            teams: {
                blue: {
                    pieces: [
                        {
                            name: PieceName.OVERLORD,
                            pos: {x: 2, y: 0}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 3, y: 0}
                        },
                        {
                            name: PieceName.CAR,
                            pos: {x: 4, y: 0}
                        }
                    ],
                    grid: [
                        {x:2, y:0, i:3},
                        {x:3, y:0, i:3},
                        {x:4, y:0, i:3},
                    ]
                },
                green: {
                    pieces: [
                        {
                            name: PieceName.CAR,
                            pos: {x: 7, y: 0}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 8, y: 0}
                        },
                        {
                            name: PieceName.OVERLORD,
                            pos: {x: 9, y: 0}
                        }
                    ],
                    grid: [
                        {x:7, y:0, i:3},
                        {x:8, y:0, i:3},
                        {x:9, y:0, i:3},
                    ]
                },
                red: {
                    pieces: [
                        {
                            name: PieceName.OVERLORD,
                            pos: {x: 2, y: 11}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 3, y: 11}
                        },
                        {
                            name: PieceName.CAR,
                            pos: {x: 4, y: 11}
                        }
                    ],
                    grid: [
                        {x:2, y:11, i:3},
                        {x:3, y:11, i:3},
                        {x:4, y:11, i:3},
                    ]
                },
                yellow: {
                    pieces: [
                        {
                            name: PieceName.CAR,
                            pos: {x: 7, y: 11}
                        },
                        {
                            name: PieceName.COLORER,
                            pos: {x: 8, y: 11}
                        },
                        {
                            name: PieceName.OVERLORD,
                            pos: {x: 9, y: 11}
                        }
                    ],
                    grid: [
                        {x:7, y:11, i:3},
                        {x:8, y:11, i:3},
                        {x:9, y:11, i:3},
                    ]
                }
            },
            paritions: [4, 4]
        },
        frontier: {
            name: "frontier",
            win: 81,
            nplayers: 6,
            gridSize: [11, 11],
            teams: {
                blue: {
                    pieces: [
                        {
                            name: PieceName.SHOOTER,
                            pos: {x: 5, y: 1}
                        },
                        {
                            name: PieceName.MEDIC,
                            pos: {x: 8, y: 3}
                        },
                        {
                            name: PieceName.BUCKETEER,
                            pos: {x: 9, y: 3}
                        }
                    ],
                    grid: [
                        {x:0, y:0, i:3},
                        {x:1, y:0, i:3},
                        {x:2, y:0, i:3},
                        {x:3, y:0, i:3},
                        {x:4, y:0, i:3},
                        {x:5, y:0, i:3},
                        {x:6, y:0, i:3},
                        {x:7, y:0, i:3},
                        {x:8, y:0, i:3},
                        {x:9, y:0, i:3},
                        {x:10, y:0, i:3},
                        {x:0, y:1, i:2},
                        {x:1, y:1, i:2},
                        {x:2, y:1, i:2},
                        {x:3, y:1, i:2},
                        {x:4, y:1, i:2},
                        {x:5, y:1, i:2},
                        {x:6, y:1, i:2},
                        {x:7, y:1, i:2},
                        {x:8, y:1, i:2},
                        {x:9, y:1, i:2},
                        {x:10, y:1, i:2},
                        {x:0, y:2, i:2},
                        {x:1, y:2, i:2},
                        {x:2, y:2, i:2},
                        {x:3, y:2, i:2},
                        {x:4, y:2, i:2},
                        {x:5, y:2, i:2},
                        {x:6, y:2, i:2},
                        {x:7, y:2, i:2},
                        {x:8, y:2, i:2},
                        {x:9, y:2, i:2},
                        {x:10, y:2, i:2},
                        {x:0, y:3, i:1},
                        {x:1, y:3, i:1},
                        {x:2, y:3, i:1},
                        {x:3, y:3, i:1},
                        {x:4, y:3, i:1},
                        {x:5, y:3, i:1},
                        {x:6, y:3, i:1},
                        {x:7, y:3, i:1},
                        {x:8, y:3, i:1},
                        {x:9, y:3, i:1},
                        {x:10, y:3, i:1},
                        {x:0, y:4, i:1},
                        {x:1, y:4, i:1},
                        {x:2, y:4, i:1},
                        {x:3, y:4, i:1},
                        {x:4, y:4, i:1},
                        {x:5, y:4, i:1},
                        {x:6, y:4, i:1},
                        {x:7, y:4, i:1},
                        {x:8, y:4, i:1},
                        {x:9, y:4, i:1},
                        {x:10, y:4, i:1}
                    ]
                },
                red: {
                    pieces: [
                        {
                            name: PieceName.PAINTER,
                            pos: {x: 5, y: 9}
                        },
                        {
                            name: PieceName.LEADER,
                            pos: {x: 2, y: 7}
                        },
                        {
                            name: PieceName.BUCKETEER,
                            pos: {x: 1, y: 7}
                        }
                    ],
                    grid: [
                        {x:0, y:10, i:3},
                        {x:1, y:10, i:3},
                        {x:2, y:10, i:3},
                        {x:3, y:10, i:3},
                        {x:4, y:10, i:3},
                        {x:5, y:10, i:3},
                        {x:6, y:10, i:3},
                        {x:7, y:10, i:3},
                        {x:8, y:10, i:3},
                        {x:9, y:10, i:3},
                        {x:10, y:10, i:3},
                        {x:0, y:9, i:2},
                        {x:1, y:9, i:2},
                        {x:2, y:9, i:2},
                        {x:3, y:9, i:2},
                        {x:4, y:9, i:2},
                        {x:5, y:9, i:2},
                        {x:6, y:9, i:2},
                        {x:7, y:9, i:2},
                        {x:8, y:9, i:2},
                        {x:9, y:9, i:2},
                        {x:10, y:9, i:2},
                        {x:0, y:8, i:2},
                        {x:1, y:8, i:2},
                        {x:2, y:8, i:2},
                        {x:3, y:8, i:2},
                        {x:4, y:8, i:2},
                        {x:5, y:8, i:2},
                        {x:6, y:8, i:2},
                        {x:7, y:8, i:2},
                        {x:8, y:8, i:2},
                        {x:9, y:8, i:2},
                        {x:10, y:8, i:2},
                        {x:0, y:7, i:1},
                        {x:1, y:7, i:1},
                        {x:2, y:7, i:1},
                        {x:3, y:7, i:1},
                        {x:4, y:7, i:1},
                        {x:5, y:7, i:1},
                        {x:6, y:7, i:1},
                        {x:7, y:7, i:1},
                        {x:8, y:7, i:1},
                        {x:9, y:7, i:1},
                        {x:10, y:7, i:1},
                        {x:0, y:6, i:1},
                        {x:1, y:6, i:1},
                        {x:2, y:6, i:1},
                        {x:3, y:6, i:1},
                        {x:4, y:6, i:1},
                        {x:5, y:6, i:1},
                        {x:6, y:6, i:1},
                        {x:7, y:6, i:1},
                        {x:8, y:6, i:1},
                        {x:9, y:6, i:1},
                        {x:10, y:6, i:1}
                    ]
                }
            }
        }
    },
    pieceTypes: {
        colorer: {
            displayName: "CLR",
            splash: true
        },
        leader: {
            displayName: "LDR",
            shoot: {
                range: 4,
                strength: 2
            },
            stun: {
                stunTime: 210
            }
        },
        car: {
            displayName: "CAR",
            move: {
                speed: 2
            }
        },
        painter: {
            displayName: "PNT",
            move: {
                strength: 3,
                diag: true
            }
        },
        overlord: {
            displayName: "OVR",
            shoot: {
                range: 4,
                strength: 2
            },
            stun: {
                stunTime: 180
            },
            move: {
                immobile: true
            },
            teleport: 3,
            cooldownMultiplier: 2
        },
        bucketeer: {
            displayName: "BKT",
            move: {
                diag: true
            },
            bucket: true
        },
        shooter: {
            displayName: "SHR",
            shoot: {
                range: 3,
                splash: true
            }
        },
        medic: {
            displayName: "MED",
            heal: true
        }
    },
    teamTypes: {
        blue: {
            emoji: "🔵",
            shades: [
                "#afc8ff",
                "#1551fe",
                "#1137ac"
            ]
        },
        red: {
            emoji: "🔴",
            shades: [
                "#ffa2a2",
                "#ff0015",
                "#af1511"
            ]
        },
        green: {
            emoji: "🟢",
            shades: [
                "#adffb8",
                "#19ff24",
                "#099f15"
            ]
        },
        yellow: {
            emoji: "🟡",
            shades: [
                "#ffeeaa",
                "#ffd400",
                "#ccaa00"
            ]
        },
        purple: {
            emoji: "🟣",
            shades: [
                "#af11af",
                "#ff00ff",
                "#ffa2ff"
            ]
        },
        orange: {
            emoji: "🟠",
            shades: [
                "#af6f11",
                "#ff7f00",
                "#ffaf7f"
            ]
        }
    }
}