/**
 * ============================================================
 * APK VIEWER PRO — Мобильная версия
 * Поддержка: JSON Tree, XML Tree, DEX, GLB Info, PNG Info, HEX Editor, CSV Advanced, Archives, SC Files
 * Адаптация под телефоны: swipe, touch, mobile menu
 * ============================================================
 */

// ============================================================
// МОДУЛЬ: Состояние приложения
// ============================================================
const AppState = (() => {
    const state = {
        apkZip: null,
        fileTree: [],
        openTabs: [],
        activeTabIndex: -1,
        sidebarWidth: 260,
        searchQuery: '',
        fileCache: new Map(),
        isProcessing: false,
        maxCacheSize: 50,
        apkName: null,
        isMobile: window.innerWidth <= 768,
        sidebarOpen: false,
    };

    const updateMobile = () => {
        state.isMobile = window.innerWidth <= 768;
        if (!state.isMobile && state.sidebarOpen) {
            state.sidebarOpen = false;
            document.getElementById('sidebar')?.classList.remove('open');
            document.querySelector('.sidebar-overlay')?.classList.remove('visible');
        }
    };

    window.addEventListener('resize', updateMobile);

    return {
        get: () => state,
        set: (key, value) => { state[key] = value; },
        update: (updates) => { Object.assign(state, updates); },
        clearCache: () => { state.fileCache.clear(); },
        reset: () => {
            state.apkZip = null;
            state.fileTree = [];
            state.openTabs = [];
            state.activeTabIndex = -1;
            state.fileCache.clear();
            state.apkName = null;
        },
        updateMobile,
    };
})();

// ============================================================
// МОДУЛЬ: Утилиты (расширенные)
// ============================================================
const Utils = {
    formatSize(bytes) {
        if (!bytes) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let i = 0;
        while (bytes >= 1024 && i < units.length - 1) {
            bytes /= 1024;
            i++;
        }
        return `${bytes.toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
    },

    getExtension(path) {
        const parts = path.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
    },

    getFileName(path) {
        return path.split('/').pop() || path;
    },

    getFileDir(path) {
        const parts = path.split('/');
        parts.pop();
        return parts.join('/') || '';
    },

    debounce(fn, delay) {
        let timer;
        return (...args) => {
            clearTimeout(timer);
            timer = setTimeout(() => fn(...args), delay);
        };
    },

    isTextFile(ext) {
        const textTypes = new Set([
            'json', 'xml', 'txt', 'html', 'htm', 'css', 'js', 'mjs', 'ts',
            'kt', 'java', 'smali', 'properties', 'yml', 'yaml', 'md',
            'toml', 'ini', 'cfg', 'conf', 'log', 'sh', 'bash',
            'py', 'rb', 'go', 'rs', 'c', 'cpp', 'h', 'hpp', 'cs',
            'php', 'lua', 'r', 'sql', 'gitignore', 'env',
            'dockerfile', 'makefile', 'cmake', 'gradle', 'xml', 'csv',
            'tsv', 'swift', 'dart', 'scala', 'groovy', 'proto',
            'rtf', 'fnt', 'atlas', 'skel', 'bytes', 'bank'
        ]);
        return textTypes.has(ext);
    },

    isImageFile(ext) {
        return new Set([
            'png', 'jpg', 'jpeg', 'webp', 'bmp', 'gif', 'svg', 'ico',
            'tiff', 'psd', 'dds', 'tga', 'ktx', 'ktx2', 'hdr', 'exr'
        ]).has(ext);
    },

    isVideoFile(ext) {
        return new Set(['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'mpeg', 'm4v', 'bik', 'usm']).has(ext);
    },

    isAudioFile(ext) {
        return new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'wma', 'm4a', 'opus', 'midi', 'xm', 'mod', 'it', 's3m']).has(ext);
    },

    is3DFile(ext) {
        return new Set(['glb', 'gltf', 'obj', 'fbx', 'stl', 'ply']).has(ext);
    },

    isFontFile(ext) {
        return new Set(['ttf', 'otf', 'woff', 'woff2', 'eot']).has(ext);
    },

    isCSVFile(ext) {
        return ext === 'csv' || ext === 'tsv';
    },

    isArchiveFile(ext) {
        return new Set(['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'apk', 'aab', 'apks', 'xapk']).has(ext);
    },

    isDEXFile(ext) {
        return new Set(['dex', 'odex', 'vdex', 'oat']).has(ext);
    },

    isJSONFile(ext) {
        return ext === 'json';
    },

    isXMLFile(ext) {
        return ext === 'xml' || ext === 'tmx' || ext === 'tsx';
    },

    isDocumentFile(ext) {
        return new Set(['pdf', 'docx', 'xlsx', 'pptx', 'epub']).has(ext);
    },

    isUnityFile(ext) {
        return new Set(['assets', 'bundle', 'assetbundle', 'unity', 'prefab', 'anim', 'controller', 'mat', 'mesh', 'shader']).has(ext);
    },

    isGameFile(ext) {
        return new Set(['sc', 'loc', 'lang', 'bank']).has(ext);
    },

    isSCFile(ext) {
        return ext === 'sc';
    },

    isBinaryFile(ext) {
        return new Set(['bin', 'pak', 'obb', 'dat', 'res', 'so', 'jar', 'class', 'onnx', 'tflite', 'gguf']).has(ext);
    },

    getFileType(ext) {
        if (this.isSCFile(ext)) return 'sc';
        if (this.isJSONFile(ext)) return 'json';
        if (this.isXMLFile(ext)) return 'xml';
        if (this.isDEXFile(ext)) return 'dex';
        if (this.isCSVFile(ext)) return 'csv';
        if (this.isTextFile(ext)) return 'text';
        if (this.isImageFile(ext)) return 'image';
        if (this.isVideoFile(ext)) return 'video';
        if (this.isAudioFile(ext)) return 'audio';
        if (this.is3DFile(ext)) return '3d';
        if (this.isFontFile(ext)) return 'font';
        if (this.isArchiveFile(ext)) return 'archive';
        if (this.isUnityFile(ext)) return 'unity';
        if (this.isGameFile(ext)) return 'game';
        if (this.isDocumentFile(ext)) return 'document';
        if (this.isBinaryFile(ext)) return 'binary';
        return 'unsupported';
    },

    getFileIcon(ext, isFolder) {
        if (isFolder) return '📁';
        const icons = {
            'json': '📋', 'xml': '📰', 'csv': '📊', 'tsv': '📊',
            'html': '🌐', 'css': '🎨', 'js': '🟨', 'ts': '🟦',
            'kt': '🟪', 'java': '☕', 'smali': '🤖',
            'properties': '⚙️', 'yml': '📋', 'yaml': '📋',
            'toml': '🔧', 'ini': '⚙️', 'cfg': '⚙️',
            'txt': '📄', 'md': '📝', 'log': '📜',
            'sh': '🐚', 'py': '🐍', 'rb': '💎', 'go': '🐹',
            'rs': '🦀', 'c': '⚡', 'cpp': '⚡', 'cs': '🎯',
            'php': '🐘', 'sql': '🗄️', 'lua': '🌙', 'r': '📊',
            'png': '🖼️', 'jpg': '🖼️', 'jpeg': '🖼️', 'webp': '🖼️',
            'bmp': '🖼️', 'gif': '🖼️', 'svg': '🖼️', 'ico': '🖼️',
            'psd': '🖼️', 'dds': '🖼️', 'tga': '🖼️',
            'mp4': '🎬', 'webm': '🎬', 'avi': '🎬', 'mov': '🎬',
            'mp3': '🎵', 'wav': '🎵', 'ogg': '🎵', 'flac': '🎵',
            'glb': '🧊', 'gltf': '🧊', 'obj': '🧊', 'fbx': '🧊',
            'ttf': '🔤', 'otf': '🔤', 'woff': '🔤', 'woff2': '🔤',
            'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦',
            'apk': '📱', 'aab': '📱', 'dex': '💻', 'so': '🔧',
            'jar': '📦', 'class': '📘', 'pdf': '📄', 'docx': '📄',
            'xlsx': '📊', 'pptx': '📊', 'epub': '📚',
            'unity': '🎮', 'prefab': '🎮', 'assetbundle': '🎮',
            'sc': '🎬', 'loc': '🌍', 'lang': '🌍',
            'bank': '🏦', 'onnx': '🤖', 'tflite': '🤖',
            'bin': '🔲', 'pak': '📦', 'obb': '📦', 'dat': '💾'
        };
        return icons[ext] || '📄';
    },

    getLanguageId(ext) {
        const map = {
            'json': 'json', 'xml': 'xml', 'html': 'html',
            'css': 'css', 'js': 'javascript', 'ts': 'typescript',
            'kt': 'kotlin', 'java': 'java', 'smali': 'smali',
            'properties': 'properties', 'yml': 'yaml', 'yaml': 'yaml',
            'toml': 'toml', 'ini': 'ini', 'md': 'markdown',
            'sh': 'shell', 'py': 'python', 'rb': 'ruby',
            'go': 'go', 'rs': 'rust', 'c': 'c', 'cpp': 'cpp',
            'cs': 'csharp', 'php': 'php', 'sql': 'sql',
            'lua': 'lua', 'r': 'r', 'txt': 'text', 'log': 'text',
            'csv': 'plaintext', 'tsv': 'plaintext',
            'swift': 'swift', 'dart': 'dart', 'scala': 'scala',
            'groovy': 'groovy', 'proto': 'protobuf',
            'rtf': 'text', 'fnt': 'text', 'atlas': 'text',
            'skel': 'text', 'bytes': 'text', 'bank': 'text'
        };
        return map[ext] || 'text';
    },

    getMimeType(ext) {
        const map = {
            'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
            'webp': 'image/webp', 'bmp': 'image/bmp', 'gif': 'image/gif',
            'svg': 'image/svg+xml', 'ico': 'image/x-icon',
            'psd': 'image/vnd.adobe.photoshop',
            'dds': 'image/vnd.ms-dds', 'tga': 'image/x-tga',
            'ktx': 'image/ktx', 'ktx2': 'image/ktx2',
            'mp4': 'video/mp4', 'webm': 'video/webm',
            'mp3': 'audio/mpeg', 'wav': 'audio/wav', 'ogg': 'audio/ogg',
            'glb': 'model/gltf-binary', 'gltf': 'model/gltf+json',
            'ttf': 'font/ttf', 'otf': 'font/otf',
            'zip': 'application/zip', 'rar': 'application/x-rar',
            'csv': 'text/csv', 'tsv': 'text/tab-separated-values',
            'pdf': 'application/pdf', 'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'epub': 'application/epub+zip'
        };
        return map[ext] || 'application/octet-stream';
    },

    detectScript(content) {
        const text = typeof content === 'string' ? content : new TextDecoder().decode(content);
        const samples = text.slice(0, 1000);

        const scripts = {
            'Cyrillic': /[\u0400-\u04FF]/,
            'Arabic': /[\u0600-\u06FF]/,
            'Hebrew': /[\u0590-\u05FF]/,
            'Devanagari': /[\u0900-\u097F]/,
            'Thai': /[\u0E00-\u0E7F]/,
            'Chinese': /[\u4E00-\u9FFF]/,
            'Japanese': /[\u3040-\u30FF\u4E00-\u9FFF]/,
            'Korean': /[\uAC00-\uD7AF]/,
            'Greek': /[\u0370-\u03FF]/,
            'Latin': /[A-Za-z]/,
        };

        const detected = [];
        for (const [name, pattern] of Object.entries(scripts)) {
            if (pattern.test(samples)) {
                detected.push(name);
            }
        }

        return detected.length ? detected : ['Latin'];
    },

    getSampleCharacters(script) {
        const samples = {
            'Cyrillic': 'АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯабвгдеёжзийклмнопрстуфхцчшщъыьэюя',
            'Latin': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()',
            'Arabic': 'ابتثجحخدذرزسشصضطظعغفقكلمنهوي',
            'Hebrew': 'אבגדהוזחטיכלמנסעפצקרשת',
            'Devanagari': 'कखगघङचछजझञटठडढणतथदधनपफबभमयरलवशषसह',
            'Thai': 'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮ',
            'Chinese': '你好世界欢迎使用',
            'Japanese': 'こんにちは世界',
            'Korean': '안녕하세요세계',
            'Greek': 'ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩαβγδεζηθικλμνξοπρστυφχψω',
        };
        return samples[script] || samples['Latin'];
    },

    parsePNGMetadata(buffer) {
        const data = new Uint8Array(buffer);
        const result = {
            width: 0,
            height: 0,
            bitDepth: 0,
            colorType: 0,
            compression: 0,
            filter: 0,
            interlace: 0,
            hasAlpha: false,
            hasPalette: false,
            chunks: [],
            dpi: 0,
        };

        try {
            const signature = [137, 80, 78, 71, 13, 10, 26, 10];
            for (let i = 0; i < 8; i++) {
                if (data[i] !== signature[i]) throw new Error('Not a PNG file');
            }

            let offset = 8;
            while (offset < data.length) {
                const chunkLength = (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
                const chunkType = String.fromCharCode(data[offset + 4], data[offset + 5], data[offset + 6], data[offset + 7]);
                const chunkData = data.slice(offset + 8, offset + 8 + chunkLength);

                result.chunks.push({ type: chunkType, length: chunkLength });

                if (chunkType === 'IHDR' && chunkLength >= 13) {
                    result.width = (chunkData[0] << 24) | (chunkData[1] << 16) | (chunkData[2] << 8) | chunkData[3];
                    result.height = (chunkData[4] << 24) | (chunkData[5] << 16) | (chunkData[6] << 8) | chunkData[7];
                    result.bitDepth = chunkData[8];
                    result.colorType = chunkData[9];
                    result.compression = chunkData[10];
                    result.filter = chunkData[11];
                    result.interlace = chunkData[12];

                    result.hasAlpha = result.colorType === 4 || result.colorType === 6;
                    result.hasPalette = result.colorType === 3;
                }

                if (chunkType === 'pHYs' && chunkLength >= 9) {
                    const ppmX = (chunkData[0] << 24) | (chunkData[1] << 16) | (chunkData[2] << 8) | chunkData[3];
                    const unit = chunkData[8];
                    if (unit === 1) {
                        result.dpi = Math.round(ppmX / 39.37);
                    }
                }

                offset += 12 + chunkLength;
            }
        } catch (e) {}

        return result;
    },

    parseDEXMetadata(buffer) {
        const data = new Uint8Array(buffer);
        const result = {
            version: '',
            fileSize: 0,
            checksum: 0,
            signature: '',
            headerSize: 0,
            endianTag: 0,
            linkSize: 0,
            linkOffset: 0,
            mapOffset: 0,
            stringIdsSize: 0,
            stringIdsOffset: 0,
            typeIdsSize: 0,
            typeIdsOffset: 0,
            protoIdsSize: 0,
            protoIdsOffset: 0,
            fieldIdsSize: 0,
            fieldIdsOffset: 0,
            methodIdsSize: 0,
            methodIdsOffset: 0,
            classDefsSize: 0,
            classDefsOffset: 0,
            dataSize: 0,
            dataOffset: 0,
            classCount: 0,
            methodCount: 0,
            fieldCount: 0,
        };

        try {
            const magic = String.fromCharCode(data[0], data[1], data[2], data[3]);
            if (magic !== 'dex') throw new Error('Not a DEX file');

            result.version = String.fromCharCode(data[4], data[5], data[6], data[7]);

            const readUint32 = (offset) => {
                return (data[offset] | (data[offset + 1] << 8) | (data[offset + 2] << 16) | (data[offset + 3] << 24)) >>> 0;
            };

            result.fileSize = readUint32(32);
            result.headerSize = readUint32(36);
            result.endianTag = readUint32(40);
            result.linkSize = readUint32(44);
            result.linkOffset = readUint32(48);
            result.mapOffset = readUint32(52);
            result.stringIdsSize = readUint32(56);
            result.stringIdsOffset = readUint32(60);
            result.typeIdsSize = readUint32(64);
            result.typeIdsOffset = readUint32(68);
            result.protoIdsSize = readUint32(72);
            result.protoIdsOffset = readUint32(76);
            result.fieldIdsSize = readUint32(80);
            result.fieldIdsOffset = readUint32(84);
            result.methodIdsSize = readUint32(88);
            result.methodIdsOffset = readUint32(92);
            result.classDefsSize = readUint32(96);
            result.classDefsOffset = readUint32(100);
            result.dataSize = readUint32(104);
            result.dataOffset = readUint32(108);

            result.classCount = result.classDefsSize;
            result.methodCount = result.methodIdsSize;
            result.fieldCount = result.fieldIdsSize;

        } catch (e) {}

        return result;
    },

    parseGLBMetadata(buffer) {
        const result = {
            meshes: 0,
            materials: 0,
            textures: 0,
            bones: 0,
            animations: 0,
            vertices: 0,
            polygons: 0,
        };

        try {
            const text = new TextDecoder().decode(buffer);
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const gltf = JSON.parse(jsonMatch[0]);

                if (gltf.meshes) {
                    result.meshes = gltf.meshes.length;
                    gltf.meshes.forEach(mesh => {
                        if (mesh.primitives) {
                            mesh.primitives.forEach(primitive => {
                                if (primitive.attributes) {
                                    const posAttr = primitive.attributes.POSITION;
                                    if (posAttr && gltf.accessors) {
                                        const accessor = gltf.accessors.find(a => a.name === posAttr || a.bufferView === posAttr);
                                        if (accessor && accessor.count) {
                                            result.vertices += accessor.count;
                                        }
                                    }
                                }
                            });
                        }
                    });
                }

                if (gltf.materials) result.materials = gltf.materials.length;
                if (gltf.textures) result.textures = gltf.textures.length;
                if (gltf.animations) {
                    result.animations = gltf.animations.length;
                    result.bones = gltf.animations.reduce((acc, anim) => acc + (anim.channels ? anim.channels.length : 0), 0);
                }

                result.polygons = Math.round(result.vertices / 3);
            }
        } catch (e) {}

        return result;
    }
};

// ============================================================
// МОДУЛЬ: EventBus
// ============================================================
const EventBus = (() => {
    const events = new Map();
    const subscribe = (event, callback) => {
        if (!events.has(event)) events.set(event, []);
        events.get(event).push(callback);
        return () => {
            const list = events.get(event);
            if (list) {
                const idx = list.indexOf(callback);
                if (idx !== -1) list.splice(idx, 1);
            }
        };
    };
    const publish = (event, data) => {
        if (events.has(event)) {
            events.get(event).forEach(cb => {
                try { cb(data); } catch (e) { console.error(e); }
            });
        }
    };
    return { subscribe, publish };
})();

// ============================================================
// МОДУЛЬ: BinaryReader (для SC парсера)
// ============================================================
class BinaryReader {
    constructor(buffer) {
        this.buffer = buffer;
        this.view = new DataView(buffer);
        this.offset = 0;
        this.length = buffer.byteLength;
    }

    u8() {
        const v = this.view.getUint8(this.offset);
        this.offset += 1;
        return v;
    }

    u16() {
        const v = this.view.getUint16(this.offset, true);
        this.offset += 2;
        return v;
    }

    u32() {
        const v = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return v;
    }

    s8() {
        const v = this.view.getInt8(this.offset);
        this.offset += 1;
        return v;
    }

    s16() {
        const v = this.view.getInt16(this.offset, true);
        this.offset += 2;
        return v;
    }

    s32() {
        const v = this.view.getInt32(this.offset, true);
        this.offset += 4;
        return v;
    }

    bytes(length) {
        const bytes = new Uint8Array(this.buffer, this.offset, length);
        this.offset += length;
        return bytes;
    }

    string(length) {
        const bytes = this.bytes(length);
        return new TextDecoder().decode(bytes);
    }

    skip(bytes) {
        this.offset += bytes;
    }

    remaining() {
        return this.length - this.offset;
    }
}

// ============================================================
// МОДУЛЬ: SCParser (парсер .sc файлов)
// ============================================================
const SCParser = {
    TYPES: {
        SHAPE: 1,
        MOVIE_CLIP: 2,
        TEXTURE: 3,
        TEXT_FIELD: 4,
        MATRIX: 5,
        COLOR_TRANSFORM: 6,
        EXPORT: 7,
        FRAME: 8,
        FRAME_ELEMENT: 9,
        LABEL: 10,
        FONT: 11,
        SOUND: 12,
    },

    parse(buffer) {
        const reader = new BinaryReader(buffer);
        const result = {
            header: null,
            movieClips: [],
            shapes: [],
            textures: [],
            matrices: [],
            colorTransforms: [],
            exports: [],
            textFields: [],
            fonts: [],
            frames: [],
            frameElements: [],
            labels: [],
            unknowns: [],
            version: 0,
            fileSize: buffer.byteLength,
            stats: {}
        };

        try {
            result.header = this._readHeader(reader);

            while (reader.offset < reader.length) {
                const tag = reader.u8();
                const object = this._readObject(reader, tag);

                if (object) {
                    switch (tag) {
                        case this.TYPES.SHAPE:
                            result.shapes.push(object);
                            break;
                        case this.TYPES.MOVIE_CLIP:
                            result.movieClips.push(object);
                            break;
                        case this.TYPES.TEXTURE:
                            result.textures.push(object);
                            break;
                        case this.TYPES.TEXT_FIELD:
                            result.textFields.push(object);
                            break;
                        case this.TYPES.MATRIX:
                            result.matrices.push(object);
                            break;
                        case this.TYPES.COLOR_TRANSFORM:
                            result.colorTransforms.push(object);
                            break;
                        case this.TYPES.EXPORT:
                            result.exports.push(object);
                            break;
                        case this.TYPES.FRAME:
                            result.frames.push(object);
                            break;
                        case this.TYPES.FRAME_ELEMENT:
                            result.frameElements.push(object);
                            break;
                        case this.TYPES.LABEL:
                            result.labels.push(object);
                            break;
                        case this.TYPES.FONT:
                            result.fonts.push(object);
                            break;
                        default:
                            result.unknowns.push({ tag, data: object });
                    }
                }
            }

            result.stats = {
                totalObjects: result.shapes.length + result.movieClips.length +
                    result.textures.length + result.matrices.length +
                    result.colorTransforms.length + result.exports.length,
                shapes: result.shapes.length,
                movieClips: result.movieClips.length,
                textures: result.textures.length,
                matrices: result.matrices.length,
                exports: result.exports.length,
            };

        } catch (e) {
            console.error('Ошибка парсинга SC:', e);
            result.error = e.message;
        }

        return result;
    },

    _readHeader(reader) {
        try {
            const magic = reader.u16();
            const version = reader.u16();
            const fileSize = reader.u32();
            return {
                magic: magic.toString(16).toUpperCase(),
                version,
                fileSize,
                isValid: magic === 0x5343 || magic === 0x4353
            };
        } catch (e) {
            return { error: 'Не удалось прочитать заголовок' };
        }
    },

    _readObject(reader, tag) {
        try {
            switch (tag) {
                case this.TYPES.SHAPE:
                    return this._readShape(reader);
                case this.TYPES.MOVIE_CLIP:
                    return this._readMovieClip(reader);
                case this.TYPES.TEXTURE:
                    return this._readTexture(reader);
                case this.TYPES.MATRIX:
                    return this._readMatrix(reader);
                case this.TYPES.COLOR_TRANSFORM:
                    return this._readColorTransform(reader);
                case this.TYPES.EXPORT:
                    return this._readExport(reader);
                case this.TYPES.TEXT_FIELD:
                    return this._readTextField(reader);
                case this.TYPES.FRAME:
                    return this._readFrame(reader);
                case this.TYPES.FRAME_ELEMENT:
                    return this._readFrameElement(reader);
                case this.TYPES.LABEL:
                    return this._readLabel(reader);
                case this.TYPES.FONT:
                    return this._readFont(reader);
                default:
                    return { tag, size: 0 };
            }
        } catch (e) {
            return { error: e.message, tag };
        }
    },

    _readShape(reader) {
        const id = reader.u16();
        const numVertices = reader.u16();
        const vertices = [];
        for (let i = 0; i < numVertices; i++) {
            vertices.push({
                x: reader.s16(),
                y: reader.s16()
            });
        }
        return {
            id,
            type: 'shape',
            vertices: vertices,
            numVertices,
            bounds: this._calculateBounds(vertices)
        };
    },

    _readMovieClip(reader) {
        const id = reader.u16();
        const frameCount = reader.u16();
        const frames = [];
        for (let i = 0; i < frameCount; i++) {
            frames.push(this._readFrame(reader));
        }
        return {
            id,
            type: 'movieclip',
            frameCount,
            frames
        };
    },

    _readTexture(reader) {
        const id = reader.u16();
        const width = reader.u16();
        const height = reader.u16();
        const format = reader.u8();
        const dataSize = reader.u32();
        const data = reader.bytes(dataSize);
        return {
            id,
            type: 'texture',
            width,
            height,
            format,
            dataSize,
            data: data
        };
    },

    _readMatrix(reader) {
        return {
            id: reader.u16(),
            type: 'matrix',
            a: reader.s16() / 1000,
            b: reader.s16() / 1000,
            c: reader.s16() / 1000,
            d: reader.s16() / 1000,
            tx: reader.s32(),
            ty: reader.s32()
        };
    },

    _readColorTransform(reader) {
        return {
            id: reader.u16(),
            type: 'colortransform',
            red: reader.u8(),
            green: reader.u8(),
            blue: reader.u8(),
            alpha: reader.u8(),
            redAdd: reader.s8(),
            greenAdd: reader.s8(),
            blueAdd: reader.s8(),
            alphaAdd: reader.s8()
        };
    },

    _readExport(reader) {
        const id = reader.u16();
        const nameLength = reader.u16();
        const name = reader.string(nameLength);
        return {
            id,
            type: 'export',
            name,
            exportId: reader.u16()
        };
    },

    _readTextField(reader) {
        const id = reader.u16();
        const textLength = reader.u16();
        const text = reader.string(textLength);
        return {
            id,
            type: 'textfield',
            text,
            fontId: reader.u16(),
            fontSize: reader.u16(),
            color: reader.u32()
        };
    },

    _readFrame(reader) {
        const elementCount = reader.u16();
        const elements = [];
        for (let i = 0; i < elementCount; i++) {
            elements.push(this._readFrameElement(reader));
        }
        return {
            elements,
            elementCount
        };
    },

    _readFrameElement(reader) {
        const id = reader.u16();
        const matrixId = reader.u16();
        const colorTransformId = reader.u16();
        return {
            id,
            type: 'frameelement',
            matrixId,
            colorTransformId,
            blendMode: reader.u8(),
            zOrder: reader.u16()
        };
    },

    _readLabel(reader) {
        const id = reader.u16();
        const nameLength = reader.u16();
        const name = reader.string(nameLength);
        return {
            id,
            type: 'label',
            name,
            frame: reader.u16()
        };
    },

    _readFont(reader) {
        const id = reader.u16();
        const nameLength = reader.u16();
        const name = reader.string(nameLength);
        const charCount = reader.u16();
        const chars = [];
        for (let i = 0; i < charCount; i++) {
            chars.push(reader.u16());
        }
        return {
            id,
            type: 'font',
            name,
            charCount,
            chars
        };
    },

    _calculateBounds(vertices) {
        if (!vertices.length) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        vertices.forEach(v => {
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
            if (v.y < minY) minY = v.y;
            if (v.y > maxY) maxY = v.y;
        });
        return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
    }
};

// ============================================================
// МОДУЛЬ: APKLoader
// ============================================================
const APKLoader = {
    async load(file) {
        const state = AppState.get();
        if (state.isProcessing) return;

        state.isProcessing = true;
        try {
            document.getElementById('status-file').textContent = `⏳ Загрузка: ${file.name}...`;

            const arrayBuffer = await file.arrayBuffer();
            const zip = await JSZip.loadAsync(arrayBuffer);

            state.apkZip = zip;
            state.apkName = file.name;
            state.fileCache.clear();

            const paths = [];
            zip.forEach((relativePath, zipEntry) => {
                if (!zipEntry.dir) {
                    paths.push(relativePath);
                }
            });

            const tree = this._buildTree(paths);
            state.fileTree = tree;

            const count = paths.length;
            document.getElementById('file-count').textContent = `${count} файлов`;
            document.getElementById('status-count').textContent = `📊 ${count}`;
            document.getElementById('status-size').textContent = `📏 ${Utils.formatSize(file.size)}`;
            document.getElementById('apk-name').textContent = `📱 ${file.name}`;
            document.getElementById('btn-close-apk').disabled = false;

            TreeRenderer.render(tree);
            EventBus.publish('apkLoaded', { zip, tree, count });

            // Показываем контент, скрываем welcome
            const welcome = document.getElementById('welcome-screen');
            if (welcome) {
                welcome.style.display = 'none';
            }

            // Закрываем sidebar на мобильных
            if (state.isMobile) {
                this.closeSidebar();
            }

            state.isProcessing = false;
            return { zip, tree, count };

        } catch (err) {
            state.isProcessing = false;
            console.error('Ошибка загрузки APK:', err);
            document.getElementById('status-file').textContent = '❌ Ошибка загрузки';
            alert('Не удалось загрузить APK. Убедитесь, что это корректный ZIP-файл.');
            throw err;
        }
    },

    _buildTree(paths) {
        const root = [];
        const map = {};

        paths.forEach(filePath => {
            const parts = filePath.split('/');
            let currentLevel = root;
            let currentPath = '';

            parts.forEach((part, idx) => {
                currentPath = currentPath ? currentPath + '/' + part : part;
                const isLast = idx === parts.length - 1;

                let node = map[currentPath];
                if (!node) {
                    node = {
                        name: part,
                        path: currentPath,
                        isFolder: !isLast,
                        children: isLast ? undefined : [],
                        size: 0,
                        type: isLast ? Utils.getExtension(part) : 'folder',
                        ext: isLast ? Utils.getExtension(part) : 'folder',
                    };
                    map[currentPath] = node;
                    currentLevel.push(node);
                }

                if (!isLast && node.children) {
                    currentLevel = node.children;
                }
            });
        });

        this._sortTree(root);
        return root;
    },

    _sortTree(tree) {
        tree.sort((a, b) => {
            if (a.isFolder && !b.isFolder) return -1;
            if (!a.isFolder && b.isFolder) return 1;
            return a.name.localeCompare(b.name);
        });
        tree.forEach(node => {
            if (node.children) this._sortTree(node.children);
        });
        return tree;
    },

    async getFileContent(path) {
        const state = AppState.get();

        if (state.fileCache.has(path)) {
            return state.fileCache.get(path);
        }

        const zip = state.apkZip;
        if (!zip) throw new Error('APK не загружен');

        const entry = zip.file(path);
        if (!entry) throw new Error(`Файл не найден: ${path}`);

        const ext = Utils.getExtension(path);
        let content;

        if (Utils.isTextFile(ext)) {
            content = await entry.async('text');
        } else {
            content = await entry.async('arraybuffer');
        }

        if (state.fileCache.size >= state.maxCacheSize) {
            const firstKey = state.fileCache.keys().next().value;
            state.fileCache.delete(firstKey);
        }
        state.fileCache.set(path, content);

        return content;
    },

    closeAPK() {
        const state = AppState.get();

        state.openTabs.forEach(tab => {
            if (tab._cleanup3D) {
                tab._cleanup3D();
                delete tab._cleanup3D;
            }
        });

        state.openTabs = [];
        state.activeTabIndex = -1;
        state.apkZip = null;
        state.fileTree = [];
        state.fileCache.clear();
        state.apkName = null;

        document.getElementById('tabs-list').innerHTML = '';

        const viewerContent = document.getElementById('viewer-content');
        // Восстанавливаем welcome-screen
        const welcomeScreen = document.getElementById('welcome-screen');
        if (welcomeScreen) {
            // Очищаем только контент, но оставляем welcome
            viewerContent.innerHTML = '';
            viewerContent.appendChild(welcomeScreen);
            welcomeScreen.style.display = 'flex';
        } else {
            // Если welcome нет — создаём заново
            viewerContent.innerHTML = `
                <div id="welcome-screen">
                    <div class="welcome-icon">📱</div>
                    <h2>APK Viewer Pro</h2>
                    <p>Откройте APK-файл для просмотра содержимого</p>
                    <button id="welcome-open" class="btn-primary">📂 Открыть APK</button>
                    <div class="welcome-hint">или перетащите файл сюда</div>
                </div>
            `;
            document.getElementById('welcome-open')?.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.apk,.zip';
                input.onchange = (e) => {
                    if (e.target.files.length) {
                        APKLoader.load(e.target.files[0]);
                    }
                };
                input.click();
            });
        }

        document.getElementById('tree-container').innerHTML = '';
        document.getElementById('apk-name').textContent = '📱 Нет APK';
        document.getElementById('btn-close-apk').disabled = true;
        document.getElementById('file-count').textContent = '0 файлов';
        document.getElementById('status-file').textContent = '📄 Файл: —';
        document.getElementById('status-size').textContent = '📏 Размер: —';
        document.getElementById('status-type').textContent = '🏷️ Тип: —';
        document.getElementById('status-count').textContent = '📊 Файлов: 0';
        document.getElementById('status-position').textContent = '📍 1:1';

        EventBus.publish('apkClosed');
    },

    toggleSidebar() {
        const state = AppState.get();
        if (!state.isMobile) return;
        state.sidebarOpen = !state.sidebarOpen;
        document.getElementById('sidebar')?.classList.toggle('open', state.sidebarOpen);
        document.querySelector('.sidebar-overlay')?.classList.toggle('visible', state.sidebarOpen);
    },

    closeSidebar() {
        const state = AppState.get();
        state.sidebarOpen = false;
        document.getElementById('sidebar')?.classList.remove('open');
        document.querySelector('.sidebar-overlay')?.classList.remove('visible');
    }
};

// ============================================================
// МОДУЛЬ: TreeRenderer
// ============================================================
const TreeRenderer = {
    _container: null,
    _searchQuery: '',

    render(tree, container) {
        this._container = container || document.getElementById('tree-container');
        this._container.innerHTML = '';
        this._renderNodes(tree, this._container, 0);
    },

    _renderNodes(nodes, parent, depth) {
        const fragment = document.createDocumentFragment();

        nodes.forEach(node => {
            const div = document.createElement('div');
            div.className = `tree-item ${node.isFolder ? 'folder' : 'file'}`;
            div.dataset.path = node.path;
            div.style.paddingLeft = `${6 + depth * 4}px`;

            const icon = Utils.getFileIcon(node.ext, node.isFolder);
            const isSearchMatch = this._searchQuery &&
                node.name.toLowerCase().includes(this._searchQuery.toLowerCase());

            let displayName = node.name;
            if (isSearchMatch && this._searchQuery) {
                const idx = displayName.toLowerCase().indexOf(this._searchQuery.toLowerCase());
                if (idx !== -1) {
                    const before = displayName.substring(0, idx);
                    const match = displayName.substring(idx, idx + this._searchQuery.length);
                    const after = displayName.substring(idx + this._searchQuery.length);
                    displayName = `${before}<span class="highlight">${match}</span>${after}`;
                }
            }

            div.innerHTML = `
                <span class="icon">${icon}</span>
                <span class="name">${displayName}</span>
                ${node.isFolder ? `<span class="arrow">▶</span>` : ''}
                ${!node.isFolder && node.size ? `<span class="badge">${Utils.formatSize(node.size)}</span>` : ''}
            `;

            fragment.appendChild(div);

            if (node.isFolder && node.children && node.children.length) {
                const childrenDiv = document.createElement('div');
                childrenDiv.className = 'tree-children';
                childrenDiv.style.display = 'none';
                fragment.appendChild(childrenDiv);
                this._renderNodes(node.children, childrenDiv, depth + 1);

                const arrow = div.querySelector('.arrow');
                if (arrow) {
                    div.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isOpen = childrenDiv.style.display !== 'none';
                        childrenDiv.style.display = isOpen ? 'none' : 'block';
                        arrow.className = 'arrow' + (isOpen ? '' : ' open');
                        if (isOpen) {
                            childrenDiv.classList.remove('open');
                        } else {
                            childrenDiv.classList.add('open');
                        }
                    });
                }
            }

            if (!node.isFolder) {
                div.addEventListener('dblclick', () => {
                    EventBus.publish('fileOpen', { path: node.path, node });
                    if (AppState.get().isMobile) {
                        APKLoader.closeSidebar();
                    }
                });

                // Tap для мобильных
                div.addEventListener('click', (e) => {
                    if (!node.isFolder && !e.target.closest('.arrow')) {
                        EventBus.publish('fileOpen', { path: node.path, node });
                        if (AppState.get().isMobile) {
                            APKLoader.closeSidebar();
                        }
                    }
                });
            }

            div.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                ContextMenu.show(e.clientX, e.clientY, { path: node.path, node });
            });

            // Долгое нажатие для мобильных
            let longPressTimer;
            div.addEventListener('touchstart', (e) => {
                if (node.isFolder) return;
                longPressTimer = setTimeout(() => {
                    const touch = e.touches[0];
                    ContextMenu.show(touch.clientX, touch.clientY, { path: node.path, node });
                }, 500);
            });
            div.addEventListener('touchend', () => clearTimeout(longPressTimer));
            div.addEventListener('touchmove', () => clearTimeout(longPressTimer));
        });

        parent.appendChild(fragment);
    },

    filter(query) {
        this._searchQuery = query;
        const state = AppState.get();
        if (state.fileTree.length) {
            this.render(state.fileTree);
        }
    }
};

// ============================================================
// МОДУЛЬ: ContextMenu (Mobile Friendly)
// ============================================================
const ContextMenu = {
    _menu: null,
    _target: null,

    init() {
        this._menu = document.getElementById('context-menu');
        document.addEventListener('click', () => this.hide());
        document.addEventListener('touchstart', (e) => {
            if (this._menu && !this._menu.contains(e.target)) {
                this.hide();
            }
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.hide();
        });
    },

    show(x, y, target) {
        this._target = target;
        const menu = this._menu;
        menu.innerHTML = '';

        const items = [
            { icon: '📂', label: 'Открыть', action: 'open' },
            { icon: '📦', label: 'Открыть как архив', action: 'openAsArchive' },
            { icon: '📤', label: 'Извлечь', action: 'extract' },
            { icon: '📋', label: 'Скопировать путь', action: 'copyPath' },
            { icon: 'ℹ️', label: 'Информация', action: 'info' },
        ];

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'ctx-item';
            div.innerHTML = `<span class="ctx-icon">${item.icon}</span> ${item.label}`;
            div.addEventListener('click', () => {
                this._handleAction(item.action);
                this.hide();
            });
            div.addEventListener('touchend', (e) => {
                e.preventDefault();
                this._handleAction(item.action);
                this.hide();
            });
            menu.appendChild(div);
        });

        menu.style.display = 'block';
        const rect = menu.getBoundingClientRect();
        const maxX = window.innerWidth - rect.width - 10;
        const maxY = window.innerHeight - rect.height - 10;
        menu.style.left = Math.min(Math.max(x, 10), maxX) + 'px';
        menu.style.top = Math.min(Math.max(y, 10), maxY) + 'px';
    },

    hide() {
        if (this._menu) this._menu.style.display = 'none';
    },

    async _handleAction(action) {
        const { path, node } = this._target || {};
        if (!path) return;

        switch (action) {
            case 'open':
                EventBus.publish('fileOpen', { path, node });
                if (AppState.get().isMobile) {
                    APKLoader.closeSidebar();
                }
                break;
            case 'openAsArchive':
                EventBus.publish('fileOpenAsArchive', { path, node });
                break;
            case 'extract': {
                try {
                    const content = await APKLoader.getFileContent(path);
                    const ext = Utils.getExtension(path);
                    const mime = Utils.getMimeType(ext);
                    const blob = new Blob([content], { type: mime });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = Utils.getFileName(path);
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 10000);
                } catch (err) {
                    alert('Ошибка извлечения: ' + err.message);
                }
                break;
            }
            case 'copyPath':
                try {
                    await navigator.clipboard.writeText(path);
                } catch {
                    const textarea = document.createElement('textarea');
                    textarea.value = path;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                }
                break;
            case 'info': {
                const size = node?.size || 0;
                alert(
                    `📄 ${path}\n` +
                    `📏 ${Utils.formatSize(size)}\n` +
                    `🏷️ ${node?.ext || 'unknown'}`
                );
                break;
            }
        }
    }
};

// ============================================================
// МОДУЛЬ: ViewerManager (расширенный)
// ============================================================
const ViewerManager = {
    _monaco: null,
    _editor: null,
    _currentTab: null,

    async init() {
        return new Promise((resolve) => {
            require.config({
                paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' }
            });
            require(['vs/editor/editor.main'], (monaco) => {
                this._monaco = monaco;
                resolve(monaco);
            });
        });
    },

    async openFile(path, content, node) {
        const state = AppState.get();

        const existingIndex = state.openTabs.findIndex(t => t.path === path);
        if (existingIndex !== -1) {
            this.switchTab(existingIndex);
            return;
        }

        const ext = Utils.getExtension(path);
        const tab = {
            path,
            content,
            ext,
            node,
            viewType: null,
        };

        state.openTabs.push(tab);
        const tabIndex = state.openTabs.length - 1;
        this.renderTabs();
        this.switchTab(tabIndex);

        // Прокрутка к новой вкладке на мобильных
        if (state.isMobile) {
            setTimeout(() => {
                const tabsList = document.getElementById('tabs-list');
                const lastTab = tabsList?.lastElementChild;
                if (lastTab) {
                    lastTab.scrollIntoView({ behavior: 'smooth', inline: 'end' });
                }
            }, 100);
        }
    },

    switchTab(index) {
        const state = AppState.get();
        if (index < 0 || index >= state.openTabs.length) return;

        if (this._editor && this._currentTab) {
            this._currentTab.content = this._editor.getValue();
        }

        state.activeTabIndex = index;
        this._currentTab = state.openTabs[index];
        this.renderTabs();
        this._renderViewer(index);

        const tab = state.openTabs[index];
        document.getElementById('status-file').textContent = `📄 ${tab.path}`;
        document.getElementById('status-type').textContent = `🏷️ ${tab.ext || 'unknown'}`;
        document.getElementById('status-position').textContent = '📍 1:1';
    },

    _renderViewer(index) {
        const state = AppState.get();
        const tab = state.openTabs[index];
        if (!tab) return;

        const container = document.getElementById('viewer-content');

        // Сохраняем welcome-screen если он есть
        const welcomeScreen = document.getElementById('welcome-screen');
        const hasWelcome = welcomeScreen !== null;

        // Очищаем контейнер, но сохраняем welcome для восстановления
        container.innerHTML = '';

        // Если есть welcome — прячем его (он будет пересоздан при закрытии)
        // Но не удаляем из DOM, а просто скрываем

        const ext = tab.ext;
        const fileType = Utils.getFileType(ext);

        try {
            // Создаём wrapper для контента
            const contentWrapper = document.createElement('div');
            contentWrapper.id = 'viewer-content-inner';
            contentWrapper.style.cssText = 'width:100%;height:100%;overflow:hidden;';

            switch (fileType) {
                case 'sc':
                    this._renderSC(contentWrapper, tab);
                    break;
                case 'json':
                    this._renderJSON(contentWrapper, tab);
                    break;
                case 'xml':
                    this._renderXML(contentWrapper, tab);
                    break;
                case 'csv':
                    this._renderCSVAdvanced(contentWrapper, tab);
                    break;
                case 'dex':
                    this._renderDEX(contentWrapper, tab);
                    break;
                case 'text':
                    this._renderText(contentWrapper, tab);
                    break;
                case 'image':
                    this._renderImageInfo(contentWrapper, tab);
                    break;
                case '3d':
                    this._renderGLBInfo(contentWrapper, tab);
                    break;
                case 'font':
                    this._renderFontMetadata(contentWrapper, tab);
                    break;
                case 'archive':
                    this._renderArchive(contentWrapper, tab);
                    break;
                case 'video':
                    this._renderVideo(contentWrapper, tab);
                    break;
                case 'audio':
                    this._renderAudio(contentWrapper, tab);
                    break;
                case 'binary':
                    this._renderHexEditor(contentWrapper, tab);
                    break;
                default:
                    this._renderUnsupported(contentWrapper, tab);
            }

            container.appendChild(contentWrapper);

        } catch (err) {
            console.error('Ошибка рендеринга:', err);
            container.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);flex-direction:column;gap:8px;padding:20px;text-align:center;">
                    <div style="font-size:32px;">⚠️</div>
                    <div>${err.message}</div>
                </div>
            `;
        }
    },

    // ============================================================
    // SC (Supercell) Viewer
    // ============================================================
    _renderSC(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            flex-direction: column;
            background: var(--bg-editor);
            overflow: hidden;
        `;

        const content = tab.content;

        if (!(content instanceof ArrayBuffer)) {
            wrapper.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);flex-direction:column;gap:8px;padding:20px;text-align:center;">
                    <div style="font-size:48px;">🎬</div>
                    <div style="margin-top:12px;">Не удалось прочитать SC файл</div>
                </div>
            `;
            container.appendChild(wrapper);
            return;
        }

        try {
            const parsed = SCParser.parse(content);

            if (parsed.error) {
                wrapper.innerHTML = `
                    <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);flex-direction:column;gap:8px;padding:20px;text-align:center;">
                        <div style="font-size:48px;">⚠️</div>
                        <div>Ошибка парсинга SC файла</div>
                        <div style="font-size:13px;color:var(--text-muted);">${parsed.error}</div>
                    </div>
                `;
                container.appendChild(wrapper);
                return;
            }

            const header = document.createElement('div');
            header.style.cssText = `
                padding: 6px 12px;
                background: var(--bg-hover);
                border-bottom: 1px solid var(--border-color);
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                font-size: 11px;
                color: var(--text-secondary);
                flex-shrink: 0;
            `;

            const infoItems = [
                { label: 'Файл', value: Utils.getFileName(tab.path) },
                { label: 'Размер', value: Utils.formatSize(tab.node?.size || 0) },
                { label: 'Версия', value: parsed.header?.version || 'N/A' },
                { label: 'MovieClips', value: parsed.movieClips.length },
                { label: 'Shapes', value: parsed.shapes.length },
                { label: 'Textures', value: parsed.textures.length },
                { label: 'Exports', value: parsed.exports.length },
            ];

            infoItems.forEach(item => {
                const div = document.createElement('div');
                div.style.display = 'flex';
                div.style.gap = '4px';
                div.innerHTML = `
                    <span style="color:var(--text-muted);">${item.label}:</span>
                    <span>${item.value}</span>
                `;
                header.appendChild(div);
            });

            wrapper.appendChild(header);

            const treeContainer = document.createElement('div');
            treeContainer.style.cssText = `
                flex: 1;
                overflow: auto;
                padding: 6px 12px;
                font-family: var(--font-mono);
                font-size: 12px;
                user-select: text;
                cursor: text;
                -webkit-overflow-scrolling: touch;
            `;

            const tree = document.createElement('div');
            tree.style.padding = '4px 0';

            const createTreeNode = (label, children, isCollapsed = true) => {
                const node = document.createElement('div');
                node.style.paddingLeft = '12px';

                const headerNode = document.createElement('div');
                headerNode.style.cssText = `
                    display: flex;
                    align-items: center;
                    gap: 4px;
                    cursor: pointer;
                    padding: 4px 4px;
                    border-radius: var(--radius-sm);
                    color: var(--text-secondary);
                    touch-action: manipulation;
                `;
                headerNode.onmouseover = () => headerNode.style.background = 'var(--bg-hover)';
                headerNode.onmouseout = () => headerNode.style.background = '';

                const toggle = document.createElement('span');
                toggle.textContent = isCollapsed ? '▶' : '▼';
                toggle.style.cssText = 'color: var(--text-muted); font-size: 9px;';

                const labelSpan = document.createElement('span');
                labelSpan.textContent = label;
                labelSpan.style.color = 'var(--text-primary)';

                const countSpan = document.createElement('span');
                countSpan.textContent = ` (${children.length})`;
                countSpan.style.cssText = 'color: var(--text-muted); font-size: 10px;';

                headerNode.appendChild(toggle);
                headerNode.appendChild(labelSpan);
                headerNode.appendChild(countSpan);

                const childrenContainer = document.createElement('div');
                childrenContainer.style.display = isCollapsed ? 'none' : 'block';
                childrenContainer.style.paddingLeft = '16px';

                children.forEach(child => {
                    childrenContainer.appendChild(child);
                });

                headerNode.onclick = () => {
                    const isOpen = childrenContainer.style.display !== 'none';
                    childrenContainer.style.display = isOpen ? 'none' : 'block';
                    toggle.textContent = isOpen ? '▶' : '▼';
                };

                node.appendChild(headerNode);
                node.appendChild(childrenContainer);
                return node;
            };

            const sections = [];

            if (parsed.movieClips.length) {
                const clips = parsed.movieClips.map(clip => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 2px 4px; color: var(--accent); font-size: 12px;';
                    div.textContent = `🎬 ID: ${clip.id} • Frames: ${clip.frameCount}`;
                    return div;
                });
                sections.push(createTreeNode('MovieClips', clips, true));
            }

            if (parsed.shapes.length) {
                const shapes = parsed.shapes.map(shape => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 2px 4px; color: var(--warning); font-size: 12px;';
                    div.textContent = `⬡ ID: ${shape.id} • Vertices: ${shape.numVertices}`;
                    return div;
                });
                sections.push(createTreeNode('Shapes', shapes, true));
            }

            if (parsed.textures.length) {
                const textures = parsed.textures.map(texture => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 2px 4px; color: var(--success); font-size: 12px;';
                    div.textContent = `🖼️ ID: ${texture.id} • ${texture.width}x${texture.height}`;
                    return div;
                });
                sections.push(createTreeNode('Textures', textures, true));
            }

            if (parsed.exports.length) {
                const exports = parsed.exports.map(exp => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 2px 4px; color: var(--danger); font-size: 12px;';
                    div.textContent = `📤 "${exp.name}" (ID: ${exp.id})`;
                    return div;
                });
                sections.push(createTreeNode('Exports', exports, true));
            }

            if (parsed.matrices.length) {
                const matrices = parsed.matrices.map(matrix => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 2px 4px; color: var(--text-secondary); font-size: 12px;';
                    div.textContent = `📐 ID: ${matrix.id} • (${matrix.tx}, ${matrix.ty})`;
                    return div;
                });
                sections.push(createTreeNode('Matrices', matrices, true));
            }

            if (parsed.colorTransforms.length) {
                const transforms = parsed.colorTransforms.map(ct => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 2px 4px; color: var(--text-secondary); font-size: 12px;';
                    div.textContent = `🎨 ID: ${ct.id} • RGBA(${ct.red},${ct.green},${ct.blue},${ct.alpha})`;
                    return div;
                });
                sections.push(createTreeNode('ColorTransforms', transforms, true));
            }

            if (parsed.textFields.length) {
                const fields = parsed.textFields.map(field => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 2px 4px; color: var(--text-primary); font-size: 12px;';
                    div.textContent = `📝 ID: ${field.id} • "${field.text}"`;
                    return div;
                });
                sections.push(createTreeNode('TextFields', fields, true));
            }

            if (parsed.labels.length) {
                const labels = parsed.labels.map(label => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 2px 4px; color: var(--warning); font-size: 12px;';
                    div.textContent = `🏷️ "${label.name}" → Frame ${label.frame}`;
                    return div;
                });
                sections.push(createTreeNode('Labels', labels, true));
            }

            if (parsed.unknowns.length) {
                const unknowns = parsed.unknowns.map(unk => {
                    const div = document.createElement('div');
                    div.style.cssText = 'padding: 2px 4px; color: var(--text-muted); font-size: 12px;';
                    div.textContent = `❓ Tag: ${unk.tag}`;
                    return div;
                });
                sections.push(createTreeNode('Unknown Objects', unknowns, true));
            }

            sections.forEach(section => tree.appendChild(section));
            treeContainer.appendChild(tree);
            wrapper.appendChild(treeContainer);

        } catch (err) {
            wrapper.innerHTML = `
                <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text-secondary);flex-direction:column;gap:8px;padding:20px;text-align:center;">
                    <div style="font-size:48px;">⚠️</div>
                    <div>Ошибка при разборе SC файла</div>
                    <div style="font-size:13px;color:var(--text-muted);">${err.message}</div>
                </div>
            `;
        }

        container.appendChild(wrapper);
    },

    // ============================================================
    // JSON Tree Viewer
    // ============================================================
    _renderJSON(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'json-tree-viewer';

        const content = typeof tab.content === 'string' ? tab.content :
            tab.content instanceof ArrayBuffer ? new TextDecoder().decode(tab.content) : '';

        try {
            const data = JSON.parse(content);
            const tree = this._buildJSONTree(data);
            wrapper.appendChild(tree);
        } catch (e) {
            wrapper.textContent = '❌ Ошибка парсинга JSON: ' + e.message;
        }

        container.appendChild(wrapper);
    },

    _buildJSONTree(data, key = 'root', isLast = true) {
        const node = document.createElement('div');
        node.className = 'json-node';

        const toggle = document.createElement('span');
        toggle.className = 'json-toggle';

        if (typeof data === 'object' && data !== null) {
            const isArray = Array.isArray(data);
            const entries = Object.entries(data);
            const isEmpty = entries.length === 0;

            toggle.textContent = isEmpty ? '▸' : '▾';

            const header = document.createElement('span');
            header.style.cursor = 'pointer';
            const keySpan = document.createElement('span');
            keySpan.className = 'json-key';
            keySpan.textContent = key !== 'root' ? `"${key}"` : 'root';

            const typeSpan = document.createElement('span');
            typeSpan.style.color = 'var(--text-muted)';
            typeSpan.style.fontSize = '11px';
            typeSpan.textContent = ` ${isArray ? '[]' : '{}'} ${isEmpty ? '(empty)' : ''}`;

            header.appendChild(keySpan);
            header.appendChild(typeSpan);

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'json-children';
            childrenContainer.style.paddingLeft = '16px';

            if (!isEmpty) {
                entries.forEach(([k, v], i) => {
                    const child = this._buildJSONTree(v, k, i === entries.length - 1);
                    childrenContainer.appendChild(child);
                });
            }

            header.onclick = () => {
                const isCollapsed = childrenContainer.style.display === 'none';
                childrenContainer.style.display = isCollapsed ? 'block' : 'none';
                toggle.textContent = isCollapsed ? '▾' : '▸';
            };

            node.appendChild(toggle);
            node.appendChild(header);
            node.appendChild(childrenContainer);

            if (isEmpty) {
                childrenContainer.style.display = 'none';
                toggle.textContent = '▸';
            }
        } else {
            const valueSpan = document.createElement('span');
            const keySpan = document.createElement('span');
            keySpan.className = 'json-key';
            keySpan.textContent = key !== 'root' ? `"${key}": ` : '';

            let valueClass = 'json-string';
            let displayValue = String(data);

            if (typeof data === 'number') {
                valueClass = 'json-number';
            } else if (typeof data === 'boolean') {
                valueClass = 'json-boolean';
            } else if (data === null) {
                valueClass = 'json-null';
                displayValue = 'null';
            } else {
                displayValue = `"${displayValue}"`;
            }

            valueSpan.className = valueClass;
            valueSpan.textContent = displayValue;

            node.appendChild(keySpan);
            node.appendChild(valueSpan);

            if (!isLast) {
                const comma = document.createElement('span');
                comma.textContent = ',';
                comma.style.color = 'var(--text-muted)';
                node.appendChild(comma);
            }
        }

        return node;
    },

    // ============================================================
    // XML Tree Viewer
    // ============================================================
    _renderXML(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'xml-tree-viewer';

        const content = typeof tab.content === 'string' ? tab.content :
            tab.content instanceof ArrayBuffer ? new TextDecoder().decode(tab.content) : '';

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, 'text/xml');
            const root = doc.documentElement;

            if (root.tagName === 'parsererror') {
                wrapper.textContent = '❌ Ошибка парсинга XML';
                container.appendChild(wrapper);
                return;
            }

            const tree = this._buildXMLTree(root);
            wrapper.appendChild(tree);
        } catch (e) {
            wrapper.textContent = '❌ Ошибка парсинга XML: ' + e.message;
        }

        container.appendChild(wrapper);
    },

    _buildXMLTree(node, isLast = true) {
        const div = document.createElement('div');
        div.className = 'xml-node';

        const toggle = document.createElement('span');
        toggle.className = 'xml-toggle';

        const hasChildren = node.children.length > 0 || node.textContent?.trim();

        if (hasChildren) {
            toggle.textContent = '▾';

            const header = document.createElement('span');
            header.style.cursor = 'pointer';

            const tag = document.createElement('span');
            tag.className = 'xml-tag';
            tag.textContent = `<${node.tagName}`;

            header.appendChild(tag);

            if (node.attributes.length > 0) {
                for (const attr of node.attributes) {
                    const attrSpan = document.createElement('span');
                    attrSpan.className = 'xml-attr';
                    attrSpan.textContent = ` ${attr.name}="`;

                    const valSpan = document.createElement('span');
                    valSpan.className = 'xml-value';
                    valSpan.textContent = attr.value;

                    const quote = document.createElement('span');
                    quote.className = 'xml-attr';
                    quote.textContent = '"';

                    header.appendChild(attrSpan);
                    header.appendChild(valSpan);
                    header.appendChild(quote);
                }
            }

            const closeTag = document.createElement('span');
            closeTag.className = 'xml-tag';
            closeTag.textContent = '>';
            header.appendChild(closeTag);

            const childrenContainer = document.createElement('div');
            childrenContainer.className = 'xml-children';
            childrenContainer.style.paddingLeft = '16px';

            const textContent = node.textContent?.trim();
            if (textContent && !node.children.length) {
                const textSpan = document.createElement('div');
                textSpan.className = 'xml-text';
                textSpan.textContent = textContent;
                childrenContainer.appendChild(textSpan);
            }

            for (let i = 0; i < node.children.length; i++) {
                const child = this._buildXMLTree(node.children[i], i === node.children.length - 1);
                childrenContainer.appendChild(child);
            }

            if (node.children.length > 0) {
                const closeDiv = document.createElement('div');
                const closeTagSpan = document.createElement('span');
                closeTagSpan.className = 'xml-tag';
                closeTagSpan.textContent = `</${node.tagName}>`;
                closeDiv.appendChild(closeTagSpan);
                childrenContainer.appendChild(closeDiv);
            }

            header.onclick = () => {
                const isCollapsed = childrenContainer.style.display === 'none';
                childrenContainer.style.display = isCollapsed ? 'block' : 'none';
                toggle.textContent = isCollapsed ? '▾' : '▸';
            };

            div.appendChild(toggle);
            div.appendChild(header);
            div.appendChild(childrenContainer);
        } else {
            const tag = document.createElement('span');
            tag.className = 'xml-tag';
            tag.textContent = `<${node.tagName}`;
            div.appendChild(tag);

            if (node.attributes.length > 0) {
                for (const attr of node.attributes) {
                    const attrSpan = document.createElement('span');
                    attrSpan.className = 'xml-attr';
                    attrSpan.textContent = ` ${attr.name}="`;

                    const valSpan = document.createElement('span');
                    valSpan.className = 'xml-value';
                    valSpan.textContent = attr.value;

                    const quote = document.createElement('span');
                    quote.className = 'xml-attr';
                    quote.textContent = '"';

                    div.appendChild(attrSpan);
                    div.appendChild(valSpan);
                    div.appendChild(quote);
                }
            }

            const closeTag = document.createElement('span');
            closeTag.className = 'xml-tag';
            closeTag.textContent = ' />';
            div.appendChild(closeTag);
        }

        return div;
    },

    // ============================================================
    // DEX Viewer
    // ============================================================
    _renderDEX(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'dex-viewer';

        const content = tab.content;
        if (content instanceof ArrayBuffer) {
            const metadata = Utils.parseDEXMetadata(content);

            const sections = [
                { title: '📋 Основная информация', items: [
                    ['Версия', metadata.version || 'Unknown'],
                    ['Размер файла', Utils.formatSize(metadata.fileSize)],
                    ['Размер заголовка', `${metadata.headerSize} байт`],
                ]},
                { title: '📊 Количество элементов', items: [
                    ['Классы', metadata.classDefsSize],
                    ['Методы', metadata.methodIdsSize],
                    ['Поля', metadata.fieldIdsSize],
                    ['Строки', metadata.stringIdsSize],
                    ['Типы', metadata.typeIdsSize],
                    ['Прототипы', metadata.protoIdsSize],
                ]},
                { title: '📍 Смещения', items: [
                    ['Строки', `0x${metadata.stringIdsOffset?.toString(16) || '0'}`],
                    ['Типы', `0x${metadata.typeIdsOffset?.toString(16) || '0'}`],
                    ['Прототипы', `0x${metadata.protoIdsOffset?.toString(16) || '0'}`],
                    ['Поля', `0x${metadata.fieldIdsOffset?.toString(16) || '0'}`],
                    ['Методы', `0x${metadata.methodIdsOffset?.toString(16) || '0'}`],
                    ['Классы', `0x${metadata.classDefsOffset?.toString(16) || '0'}`],
                    ['Данные', `0x${metadata.dataOffset?.toString(16) || '0'}`],
                ]},
            ];

            sections.forEach(section => {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'dex-section';

                const title = document.createElement('div');
                title.className = 'dex-section-title';
                title.textContent = section.title;
                sectionDiv.appendChild(title);

                section.items.forEach(([label, value]) => {
                    const item = document.createElement('div');
                    item.className = 'dex-item';
                    item.innerHTML = `
                        <span class="dex-label">${label}</span>
                        <span>${value}</span>
                    `;
                    sectionDiv.appendChild(item);
                });

                wrapper.appendChild(sectionDiv);
            });

            const statsDiv = document.createElement('div');
            statsDiv.className = 'dex-section';
            statsDiv.innerHTML = `
                <div class="dex-section-title">📈 Статистика</div>
                <div class="dex-item"><span class="dex-label">Всего классов</span><span>${metadata.classCount || 0}</span></div>
                <div class="dex-item"><span class="dex-label">Всего методов</span><span>${metadata.methodCount || 0}</span></div>
                <div class="dex-item"><span class="dex-label">Всего полей</span><span>${metadata.fieldCount || 0}</span></div>
            `;
            wrapper.appendChild(statsDiv);

        } else {
            wrapper.textContent = 'DEX файл не распознан';
        }

        container.appendChild(wrapper);
    },

    // ============================================================
    // Image Viewer с метаданными
    // ============================================================
    _renderImageInfo(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'image-info-viewer';

        const content = tab.content;
        const imgContainer = document.createElement('div');
        imgContainer.className = 'image-container';

        const img = document.createElement('img');
        const blob = content instanceof ArrayBuffer ?
            new Blob([content], { type: Utils.getMimeType(tab.ext) }) :
            new Blob([content]);

        const url = URL.createObjectURL(blob);
        img.src = url;
        img.alt = tab.path;

        imgContainer.appendChild(img);
        wrapper.appendChild(imgContainer);

        const metadata = document.createElement('div');
        metadata.className = 'image-metadata';

        const items = [
            { label: 'Файл', value: Utils.getFileName(tab.path) },
            { label: 'Размер', value: Utils.formatSize(tab.node?.size || 0) },
            { label: 'Тип', value: tab.ext.toUpperCase() },
        ];

        if (tab.ext === 'png' && content instanceof ArrayBuffer) {
            const pngInfo = Utils.parsePNGMetadata(content);
            items.push(
                { label: 'Ширина', value: `${pngInfo.width}px` },
                { label: 'Высота', value: `${pngInfo.height}px` },
                { label: 'Альфа', value: pngInfo.hasAlpha ? '✅ Да' : '❌ Нет' },
                { label: 'DPI', value: pngInfo.dpi ? `${pngInfo.dpi} DPI` : 'N/A' },
            );
        }

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'meta-item';
            div.innerHTML = `
                <span class="meta-label">${item.label}:</span>
                <span>${item.value}</span>
            `;
            metadata.appendChild(div);
        });

        wrapper.appendChild(metadata);
        container.appendChild(wrapper);
    },

    // ============================================================
    // GLB Viewer с метаданными
    // ============================================================
    _renderGLBInfo(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'glb-info-viewer';

        const glbContainer = document.createElement('div');
        glbContainer.className = 'glb-container';

        const sceneContainer = document.createElement('div');
        sceneContainer.style.width = '100%';
        sceneContainer.style.height = '100%';
        glbContainer.appendChild(sceneContainer);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0e14);

        const camera = new THREE.PerspectiveCamera(45, sceneContainer.clientWidth / sceneContainer.clientHeight || 1, 0.1, 1000);
        camera.position.set(5, 5, 5);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });
        renderer.setSize(sceneContainer.clientWidth || 400, sceneContainer.clientHeight || 300);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        sceneContainer.appendChild(renderer.domElement);

        const controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.5;

        const ambient = new THREE.AmbientLight(0x404060, 0.5);
        scene.add(ambient);

        const main = new THREE.DirectionalLight(0xffffff, 1.5);
        main.position.set(10, 20, 10);
        main.castShadow = true;
        scene.add(main);

        const fill = new THREE.DirectionalLight(0x4488ff, 0.5);
        fill.position.set(-10, 0, 10);
        scene.add(fill);

        const hemi = new THREE.HemisphereLight(0x4488ff, 0x8844ff, 0.4);
        scene.add(hemi);

        const grid = new THREE.GridHelper(10, 20, 0x58a6ff, 0x1e2630);
        grid.position.y = -0.5;
        scene.add(grid);

        const content = tab.content;
        const blob = new Blob([content], { type: 'model/gltf-binary' });
        const url = URL.createObjectURL(blob);

        const loader = new THREE.GLTFLoader();
        loader.load(url, (gltf) => {
            const box = new THREE.Box3().setFromObject(gltf.scene);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = maxDim > 0 ? 2 / maxDim : 1;

            gltf.scene.scale.multiplyScalar(scale);
            gltf.scene.position.sub(center.multiplyScalar(scale));

            scene.add(gltf.scene);
            URL.revokeObjectURL(url);
        }, undefined, () => {});

        let animationId;
        const animate = () => {
            animationId = requestAnimationFrame(animate);
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        const resizeObserver = new ResizeObserver(() => {
            const w = sceneContainer.clientWidth;
            const h = sceneContainer.clientHeight;
            if (w > 0 && h > 0) {
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            }
        });
        resizeObserver.observe(sceneContainer);

        tab._cleanup3D = () => {
            cancelAnimationFrame(animationId);
            resizeObserver.disconnect();
            renderer.dispose();
        };

        wrapper.appendChild(glbContainer);

        const metadata = document.createElement('div');
        metadata.className = 'glb-metadata';

        const glbInfo = Utils.parseGLBMetadata(content);
        const items = [
            { label: 'Файл', value: Utils.getFileName(tab.path) },
            { label: 'Размер', value: Utils.formatSize(tab.node?.size || 0) },
            { label: 'Мешей', value: glbInfo.meshes || 0 },
            { label: 'Материалов', value: glbInfo.materials || 0 },
            { label: 'Текстур', value: glbInfo.textures || 0 },
            { label: 'Анимаций', value: glbInfo.animations || 0 },
            { label: 'Вершин', value: glbInfo.vertices || 0 },
        ];

        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'meta-item';
            div.innerHTML = `
                <span class="meta-label">${item.label}:</span>
                <span>${item.value}</span>
            `;
            metadata.appendChild(div);
        });

        wrapper.appendChild(metadata);
        container.appendChild(wrapper);
    },

    // ============================================================
    // Font Viewer с метаданными
    // ============================================================
    _renderFontMetadata(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'font-metadata-viewer';

        const content = tab.content;
        const fileName = Utils.getFileName(tab.path);

        let scripts = ['Latin'];
        let sampleText = '';

        try {
            const text = content instanceof ArrayBuffer ?
                new TextDecoder().decode(content.slice(0, 4096)) :
                String(content);
            scripts = Utils.detectScript(text);
            sampleText = scripts.map(s => Utils.getSampleCharacters(s)).join(' ');
        } catch (e) {
            sampleText = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789 !@#$%^&*()';
        }

        const previewSection = document.createElement('div');
        previewSection.className = 'font-preview-section';

        const previewText = document.createElement('div');
        previewText.className = 'font-preview-text';

        const fontName = fileName.replace(/\.[^.]+$/, '');
        const fontFace = new FontFace(fontName, `url(data:font/ttf;base64,${this._arrayBufferToBase64(content)})`);

        fontFace.load().then(() => {
            document.fonts.add(fontFace);
            previewText.style.fontFamily = fontName;
            previewText.textContent = sampleText.slice(0, 150);
        }).catch(() => {
            previewText.textContent = sampleText.slice(0, 150);
        });

        previewSection.appendChild(previewText);
        wrapper.appendChild(previewSection);

        const metadataGrid = document.createElement('div');
        metadataGrid.className = 'font-metadata-grid';
        const metaItems = [
            ['Имя файла', fileName],
            ['Размер', Utils.formatSize(tab.node?.size || 0)],
            ['Скрипты', scripts.join(', ')],
            ['Символов', sampleText.length],
        ];

        metaItems.forEach(([label, value]) => {
            const div = document.createElement('div');
            div.innerHTML = `<span class="meta-label">${label}:</span>`;
            metadataGrid.appendChild(div);
            const valDiv = document.createElement('div');
            valDiv.textContent = value;
            metadataGrid.appendChild(valDiv);
        });

        wrapper.appendChild(metadataGrid);

        const charGrid = document.createElement('div');
        charGrid.className = 'font-char-grid';

        const chars = sampleText.slice(0, 150).split('');
        chars.forEach(char => {
            if (char && char.trim()) {
                const span = document.createElement('span');
                span.className = 'char';
                span.textContent = char;
                span.style.fontFamily = fontName;
                charGrid.appendChild(span);
            }
        });

        wrapper.appendChild(charGrid);
        container.appendChild(wrapper);
    },

    _arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    // ============================================================
    // Archive Viewer
    // ============================================================
    _renderArchive(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'archive-viewer';

        const content = tab.content;

        if (content instanceof ArrayBuffer) {
            try {
                JSZip.loadAsync(content).then(zip => {
                    const items = [];
                    zip.forEach((path, entry) => {
                        if (!entry.dir) {
                            items.push({ path, size: entry._data?.uncompressedSize || 0 });
                        }
                    });

                    items.sort((a, b) => a.path.localeCompare(b.path));

                    const totalSize = items.reduce((sum, item) => sum + item.size, 0);

                    const header = document.createElement('div');
                    header.style.cssText = `
                        padding: 6px 10px; background: var(--bg-hover);
                        border-radius: var(--radius-sm); margin-bottom: 8px;
                        color: var(--text-secondary); font-size: 12px;
                    `;
                    header.textContent = `📦 ${items.length} файлов • ${Utils.formatSize(totalSize)}`;
                    wrapper.appendChild(header);

                    items.forEach(item => {
                        const div = document.createElement('div');
                        div.className = 'archive-item';

                        const icon = Utils.getFileIcon(Utils.getExtension(item.path), false);
                        div.innerHTML = `
                            <span>${icon}</span>
                            <span class="archive-name">${item.path}</span>
                            <span class="archive-size">${Utils.formatSize(item.size)}</span>
                        `;
                        wrapper.appendChild(div);
                    });
                }).catch(() => {
                    wrapper.innerHTML = `
                        <div style="color:var(--text-secondary);text-align:center;padding:30px;">
                            <div style="font-size:40px;">📦</div>
                            <div style="margin-top:8px;">Не удалось открыть архив</div>
                        </div>
                    `;
                });
            } catch (e) {
                wrapper.innerHTML = `
                    <div style="color:var(--text-secondary);text-align:center;padding:30px;">
                        <div style="font-size:40px;">📦</div>
                        <div style="margin-top:8px;">Ошибка открытия архива</div>
                    </div>
                `;
            }
        } else {
            wrapper.textContent = 'Архив не распознан';
        }

        container.appendChild(wrapper);
    },

    // ============================================================
    // CSV Advanced Viewer
    // ============================================================
    _renderCSVAdvanced(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'csv-advanced-viewer';

        const content = typeof tab.content === 'string' ? tab.content :
            tab.content instanceof ArrayBuffer ? new TextDecoder().decode(tab.content) : '';

        const toolbar = document.createElement('div');
        toolbar.className = 'csv-toolbar';

        const searchInput = document.createElement('input');
        searchInput.placeholder = '🔍 Поиск...';

        const sortSelect = document.createElement('select');
        sortSelect.innerHTML = `<option value="">Без сортировки</option><option value="asc">По возрастанию</option><option value="desc">По убыванию</option>`;

        const filterInput = document.createElement('input');
        filterInput.placeholder = '🎯 Фильтр...';

        const infoSpan = document.createElement('span');
        infoSpan.style.cssText = 'color:var(--text-muted);font-size:11px;margin-left:auto;';

        toolbar.appendChild(searchInput);
        toolbar.appendChild(sortSelect);
        toolbar.appendChild(filterInput);
        toolbar.appendChild(infoSpan);
        wrapper.appendChild(toolbar);

        const tableContainer = document.createElement('div');
        tableContainer.className = 'csv-table-container';
        wrapper.appendChild(tableContainer);

        let data = [];
        let headers = [];
        let filteredData = [];

        try {
            const lines = content.split('\n').filter(line => line.trim());
            if (lines.length === 0) {
                tableContainer.innerHTML = '<div class="csv-empty">📊 CSV файл пуст</div>';
                container.appendChild(wrapper);
                return;
            }

            const parseRow = (row) => {
                const result = [];
                let current = '';
                let inQuotes = false;
                for (let i = 0; i < row.length; i++) {
                    const char = row[i];
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if ((char === ',' || char === '\t') && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += char;
                    }
                }
                result.push(current.trim());
                return result;
            };

            headers = parseRow(lines[0]);
            data = [];
            for (let i = 1; i < Math.min(lines.length, 1001); i++) {
                const cells = parseRow(lines[i]);
                const row = {};
                headers.forEach((h, idx) => {
                    row[h] = cells[idx] || '';
                });
                data.push(row);
            }

            filteredData = [...data];
            infoSpan.textContent = `📊 ${data.length} строк • ${headers.length} колонок`;

            const renderTable = () => {
                const table = document.createElement('table');

                const thead = document.createElement('thead');
                const headerRow = document.createElement('tr');
                headers.forEach(h => {
                    const th = document.createElement('th');
                    th.textContent = h;
                    th.dataset.column = h;
                    headerRow.appendChild(th);
                });
                thead.appendChild(headerRow);
                table.appendChild(thead);

                const tbody = document.createElement('tbody');
                const displayData = filteredData.slice(0, 500);
                displayData.forEach(row => {
                    const tr = document.createElement('tr');
                    headers.forEach(h => {
                        const td = document.createElement('td');
                        td.textContent = row[h] || '';
                        tr.appendChild(td);
                    });
                    tbody.appendChild(tr);
                });

                if (filteredData.length > 500) {
                    const tr = document.createElement('tr');
                    const td = document.createElement('td');
                    td.colSpan = headers.length;
                    td.style.cssText = 'text-align:center;color:var(--text-muted);padding:6px;';
                    td.textContent = `... и ещё ${filteredData.length - 500} строк`;
                    tr.appendChild(td);
                    tbody.appendChild(tr);
                }

                table.appendChild(tbody);
                tableContainer.innerHTML = '';
                tableContainer.appendChild(table);
            };

            searchInput.addEventListener('input', () => {
                const query = searchInput.value.toLowerCase();
                filteredData = data.filter(row => {
                    return Object.values(row).some(val =>
                        String(val).toLowerCase().includes(query)
                    );
                });
                renderTable();
                infoSpan.textContent = `📊 ${filteredData.length} строк (из ${data.length}) • ${headers.length} колонок`;
            });

            sortSelect.addEventListener('change', () => {
                const sortType = sortSelect.value;
                if (sortType) {
                    const firstHeader = headers[0];
                    filteredData.sort((a, b) => {
                        const valA = String(a[firstHeader] || '').toLowerCase();
                        const valB = String(b[firstHeader] || '').toLowerCase();
                        return sortType === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
                    });
                } else {
                    filteredData = [...data];
                }
                renderTable();
                infoSpan.textContent = `📊 ${filteredData.length} строк • ${headers.length} колонок`;
            });

            filterInput.addEventListener('input', () => {
                const query = filterInput.value.toLowerCase();
                if (query) {
                    filteredData = data.filter(row => {
                        return Object.values(row).some(val =>
                            String(val).toLowerCase().includes(query)
                        );
                    });
                } else {
                    filteredData = [...data];
                }
                renderTable();
                infoSpan.textContent = `📊 ${filteredData.length} строк • ${headers.length} колонок`;
            });

            renderTable();

        } catch (err) {
            tableContainer.innerHTML = `
                <div class="csv-empty">
                    ⚠️ Ошибка парсинга CSV: ${err.message}
                </div>
            `;
        }

        container.appendChild(wrapper);
    },

    // ============================================================
    // Hex Editor (расширенный)
    // ============================================================
    _renderHexEditor(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'hex-editor-viewer';

        const content = tab.content;

        const toolbar = document.createElement('div');
        toolbar.className = 'hex-toolbar';

        const searchInput = document.createElement('input');
        searchInput.placeholder = '🔍 Поиск (hex или текст)...';

        const searchBtn = document.createElement('button');
        searchBtn.textContent = 'Найти';

        const gotoInput = document.createElement('input');
        gotoInput.placeholder = 'Перейти к offset...';

        const gotoBtn = document.createElement('button');
        gotoBtn.textContent = 'Перейти';

        const infoSpan = document.createElement('span');
        infoSpan.style.cssText = 'color:var(--text-muted);font-size:11px;margin-left:auto;';

        toolbar.appendChild(searchInput);
        toolbar.appendChild(searchBtn);
        toolbar.appendChild(gotoInput);
        toolbar.appendChild(gotoBtn);
        toolbar.appendChild(infoSpan);
        wrapper.appendChild(toolbar);

        const hexContent = document.createElement('div');
        hexContent.className = 'hex-content';
        wrapper.appendChild(hexContent);

        if (content instanceof ArrayBuffer) {
            const bytes = new Uint8Array(content);
            const maxLines = Math.min(bytes.length, 2000);
            let lines = [];

            const renderHex = () => {
                hexContent.innerHTML = '';
                const fragment = document.createDocumentFragment();

                for (let i = 0; i < maxLines; i += 16) {
                    const chunk = bytes.slice(i, i + 16);
                    const hexPart = Array.from(chunk)
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join(' ')
                        .padEnd(48);

                    const asciiPart = Array.from(chunk)
                        .map(b => b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')
                        .join('');

                    const line = document.createElement('div');
                    line.className = 'hex-line';
                    line.innerHTML = `
                        <span class="hex-offset">${i.toString(16).padStart(8, '0')}</span>
                        <span class="hex-bytes">${hexPart}</span>
                        <span class="hex-ascii">${asciiPart}</span>
                    `;
                    fragment.appendChild(line);
                }

                hexContent.appendChild(fragment);

                if (bytes.length > 2000) {
                    const more = document.createElement('div');
                    more.style.cssText = 'color:var(--text-muted);padding:6px;text-align:center;font-size:11px;';
                    more.textContent = `... и ещё ${bytes.length - 2000} байт`;
                    hexContent.appendChild(more);
                }

                infoSpan.textContent = `📏 ${Utils.formatSize(bytes.length)} • ${bytes.length} байт`;
            };

            renderHex();

            searchBtn.addEventListener('click', () => {
                const query = searchInput.value;
                if (!query) return;

                let searchBytes = [];
                if (query.match(/^[0-9a-fA-F\s]+$/)) {
                    const hexStr = query.replace(/\s/g, '');
                    for (let i = 0; i < hexStr.length; i += 2) {
                        searchBytes.push(parseInt(hexStr.substr(i, 2), 16));
                    }
                } else {
                    const encoder = new TextEncoder();
                    searchBytes = Array.from(encoder.encode(query));
                }

                for (let i = 0; i < bytes.length - searchBytes.length + 1; i++) {
                    let found = true;
                    for (let j = 0; j < searchBytes.length; j++) {
                        if (bytes[i + j] !== searchBytes[j]) {
                            found = false;
                            break;
                        }
                    }
                    if (found) {
                        const offset = i;
                        const lineIndex = Math.floor(offset / 16);
                        const lines = hexContent.querySelectorAll('.hex-line');
                        if (lines[lineIndex]) {
                            lines[lineIndex].classList.add('highlight');
                            lines[lineIndex].scrollIntoView({ block: 'center' });
                        }
                        break;
                    }
                }
            });

            gotoBtn.addEventListener('click', () => {
                const offset = parseInt(gotoInput.value);
                if (isNaN(offset)) return;

                const lineIndex = Math.floor(offset / 16);
                const lines = hexContent.querySelectorAll('.hex-line');
                if (lines[lineIndex]) {
                    lines[lineIndex].scrollIntoView({ block: 'center' });
                    lines[lineIndex].classList.add('highlight');
                    setTimeout(() => lines[lineIndex].classList.remove('highlight'), 2000);
                }
            });

        } else {
            hexContent.textContent = String(content).slice(0, 1000);
            infoSpan.textContent = '📄 Текстовые данные';
        }

        container.appendChild(wrapper);
    },

    // ============================================================
    // Текстовый просмотрщик
    // ============================================================
    _renderText(container, tab) {
        const language = Utils.getLanguageId(tab.ext);
        const content = typeof tab.content === 'string' ? tab.content :
            tab.content instanceof ArrayBuffer ? new TextDecoder().decode(tab.content) :
            '';

        const state = AppState.get();
        const useSimpleViewer = state.isMobile || content.length < 30000;

        if (!useSimpleViewer && this._monaco) {
            this._editor = this._monaco.editor.create(container, {
                value: content,
                language: language,
                theme: 'vs-dark',
                automaticLayout: true,
                minimap: { enabled: false },
                scrollbar: { vertical: 'visible', horizontal: 'visible' },
                lineNumbers: 'on',
                folding: true,
                readOnly: true,
                fontSize: 12,
                fontFamily: 'JetBrains Mono, monospace',
                renderWhitespace: 'selection',
                cursorStyle: 'line',
            });

            this._editor.onDidChangeCursorPosition((e) => {
                document.getElementById('status-position').textContent = `📍 ${e.position.lineNumber}:${e.position.column}`;
            });
        } else {
            const viewer = document.createElement('div');
            viewer.className = 'text-viewer';
            viewer.style.userSelect = 'text';
            viewer.style.cursor = 'text';

            const lines = content.split('\n');
            const fragment = document.createDocumentFragment();

            lines.forEach((line, i) => {
                const div = document.createElement('div');
                div.className = 'line';
                div.innerHTML = `
                    <span class="line-number">${i + 1}</span>
                    <span class="line-content">${this._escapeHtml(line) || ' '}</span>
                `;
                fragment.appendChild(div);
            });

            viewer.appendChild(fragment);
            container.appendChild(viewer);
        }
    },

    // ============================================================
    // Видео просмотрщик
    // ============================================================
    _renderVideo(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'video-viewer';

        const video = document.createElement('video');
        video.controls = true;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '100%';

        const content = tab.content;
        const blob = content instanceof ArrayBuffer ?
            new Blob([content], { type: Utils.getMimeType(tab.ext) }) :
            new Blob([content]);

        const url = URL.createObjectURL(blob);
        video.src = url;

        wrapper.appendChild(video);
        container.appendChild(wrapper);
    },

    // ============================================================
    // Аудио просмотрщик
    // ============================================================
    _renderAudio(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'audio-viewer';

        const icon = document.createElement('div');
        icon.className = 'audio-icon';
        icon.textContent = '🎵';

        const name = document.createElement('div');
        name.className = 'audio-name';
        name.textContent = Utils.getFileName(tab.path);

        const audio = document.createElement('audio');
        audio.controls = true;
        audio.style.width = '80%';
        audio.style.maxWidth = '400px';

        const content = tab.content;
        const blob = content instanceof ArrayBuffer ?
            new Blob([content], { type: Utils.getMimeType(tab.ext) }) :
            new Blob([content]);

        const url = URL.createObjectURL(blob);
        audio.src = url;

        wrapper.appendChild(icon);
        wrapper.appendChild(name);
        wrapper.appendChild(audio);
        container.appendChild(wrapper);
    },

    // ============================================================
    // Неподдерживаемый формат
    // ============================================================
    _renderUnsupported(container, tab) {
        const wrapper = document.createElement('div');
        wrapper.className = 'unsupported-viewer';
        wrapper.innerHTML = `
            <div class="unsupported-icon">📄</div>
            <div class="unsupported-title">Формат не поддерживается</div>
            <div class="unsupported-desc">Просмотр файлов с расширением <strong>.${tab.ext}</strong> пока не добавлен</div>
            <div class="unsupported-ext">.${tab.ext}</div>
        `;
        container.appendChild(wrapper);
    },

    _escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // ============================================================
    // Управление вкладками
    // ============================================================
    renderTabs() {
        const container = document.getElementById('tabs-list');
        const state = AppState.get();
        container.innerHTML = '';

        state.openTabs.forEach((tab, index) => {
            const tabDiv = document.createElement('div');
            tabDiv.className = `tab ${index === state.activeTabIndex ? 'active' : ''}`;

            const icon = Utils.getFileIcon(tab.ext, false);

            tabDiv.innerHTML = `
                <span class="tab-icon">${icon}</span>
                <span class="tab-name">${Utils.getFileName(tab.path)}</span>
                <button class="tab-close" data-index="${index}">✕</button>
            `;

            tabDiv.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-close')) return;
                this.switchTab(index);
            });

            tabDiv.querySelector('.tab-close').addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeTab(index);
            });

            container.appendChild(tabDiv);
        });
    },

    closeTab(index) {
        const state = AppState.get();
        const tab = state.openTabs[index];

        if (!tab) return;

        if (tab._cleanup3D) {
            tab._cleanup3D();
            delete tab._cleanup3D;
        }

        state.openTabs.splice(index, 1);

        if (state.activeTabIndex === index) {
            const newIndex = Math.min(index, state.openTabs.length - 1);
            if (newIndex >= 0) {
                this.switchTab(newIndex);
            } else {
                state.activeTabIndex = -1;
                this._currentTab = null;
                this.renderTabs();

                // Возвращаем welcome-screen
                const container = document.getElementById('viewer-content');
                const welcome = document.getElementById('welcome-screen');
                if (welcome) {
                    container.innerHTML = '';
                    container.appendChild(welcome);
                    welcome.style.display = 'flex';
                } else {
                    container.innerHTML = `
                        <div id="welcome-screen">
                            <div class="welcome-icon">📱</div>
                            <h2>APK Viewer Pro</h2>
                            <p>Откройте APK-файл для просмотра содержимого</p>
                            <button id="welcome-open" class="btn-primary">📂 Открыть APK</button>
                            <div class="welcome-hint">или перетащите файл сюда</div>
                        </div>
                    `;
                    document.getElementById('welcome-open')?.addEventListener('click', () => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.apk,.zip';
                        input.onchange = (e) => {
                            if (e.target.files.length) {
                                APKLoader.load(e.target.files[0]);
                            }
                        };
                        input.click();
                    });
                }

                document.getElementById('status-file').textContent = '📄 Файл: —';
                document.getElementById('status-type').textContent = '🏷️ Тип: —';
                document.getElementById('status-position').textContent = '📍 1:1';
            }
        } else if (state.activeTabIndex > index) {
            state.activeTabIndex--;
        }

        this.renderTabs();
    },

    closeAllTabs() {
        const state = AppState.get();

        state.openTabs.forEach(tab => {
            if (tab._cleanup3D) {
                tab._cleanup3D();
                delete tab._cleanup3D;
            }
        });

        state.openTabs = [];
        state.activeTabIndex = -1;
        this._currentTab = null;
        this.renderTabs();

        const container = document.getElementById('viewer-content');
        const welcome = document.getElementById('welcome-screen');
        if (welcome) {
            container.innerHTML = '';
            container.appendChild(welcome);
            welcome.style.display = 'flex';
        } else {
            container.innerHTML = `
                <div id="welcome-screen">
                    <div class="welcome-icon">📱</div>
                    <h2>APK Viewer Pro</h2>
                    <p>Откройте APK-файл для просмотра содержимого</p>
                    <button id="welcome-open" class="btn-primary">📂 Открыть APK</button>
                    <div class="welcome-hint">или перетащите файл сюда</div>
                </div>
            `;
            document.getElementById('welcome-open')?.addEventListener('click', () => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.apk,.zip';
                input.onchange = (e) => {
                    if (e.target.files.length) {
                        APKLoader.load(e.target.files[0]);
                    }
                };
                input.click();
            });
        }

        document.getElementById('status-file').textContent = '📄 Файл: —';
        document.getElementById('status-type').textContent = '🏷️ Тип: —';
        document.getElementById('status-position').textContent = '📍 1:1';
    }
};

// ============================================================
// МОДУЛЬ: SearchManager
// ============================================================
const SearchManager = {
    _debouncedSearch: null,

    init() {
        this._debouncedSearch = Utils.debounce(this._performSearch.bind(this), 200);
    },

    search(query) {
        this._debouncedSearch(query);
    },

    _performSearch(query) {
        const state = AppState.get();
        const tree = state.fileTree;

        if (!tree.length) return;

        if (!query || query.length < 1) {
            TreeRenderer.filter('');
            const count = this._countFiles(tree);
            document.getElementById('file-count').textContent = `${count} файлов`;
            document.getElementById('search-clear').classList.remove('visible');
            return;
        }

        document.getElementById('search-clear').classList.add('visible');

        const filtered = this._filterTree(tree, query.toLowerCase());
        const count = this._countFiles(filtered);

        TreeRenderer.render(filtered);
        document.getElementById('file-count').textContent = `🔍 ${count}`;
        TreeRenderer._searchQuery = query;
    },

    _filterTree(tree, query) {
        return tree
            .map(node => {
                if (node.isFolder && node.children) {
                    const filteredChildren = this._filterTree(node.children, query);
                    if (filteredChildren.length > 0) {
                        return { ...node, children: filteredChildren };
                    }
                    return null;
                } else if (!node.isFolder) {
                    if (node.name.toLowerCase().includes(query)) {
                        return { ...node };
                    }
                    return null;
                }
                return null;
            })
            .filter(Boolean);
    },

    _countFiles(tree) {
        let count = 0;
        for (const node of tree) {
            if (!node.isFolder) count++;
            if (node.children) count += this._countFiles(node.children);
        }
        return count;
    },

    clear() {
        document.getElementById('search-input').value = '';
        document.getElementById('search-clear').classList.remove('visible');
        TreeRenderer.filter('');
        const state = AppState.get();
        if (state.fileTree.length) {
            const count = this._countFiles(state.fileTree);
            document.getElementById('file-count').textContent = `${count} файлов`;
        }
    }
};

// ============================================================
// МОДУЛЬ: UI
// ============================================================
const UI = {
    init() {
        const state = AppState.get();

        // Mobile menu toggle
        const menuToggle = document.getElementById('menu-toggle');
        const sidebarClose = document.getElementById('sidebar-close');

        menuToggle?.addEventListener('click', () => {
            APKLoader.toggleSidebar();
        });

        sidebarClose?.addEventListener('click', () => {
            APKLoader.closeSidebar();
        });

        // Создание оверлея для мобильных
        const overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
        overlay.addEventListener('click', () => {
            APKLoader.closeSidebar();
        });

        // Меню пункты
        document.querySelector('[data-menu="view"]')?.addEventListener('click', () => {
            alert('👁️ APK Viewer Pro\n\n' +
                '📄 Текст: JSON, XML, HTML, CSS, JS, TS, Java, Kotlin, Smali, Swift, Dart\n' +
                '📊 Таблицы: CSV, TSV (сортировка, поиск, фильтр)\n' +
                '🖼️ Изображения: PNG, JPG, WebP, BMP, GIF, SVG, PSD, DDS, TGA\n' +
                '🎬 Видео: MP4, WebM, AVI, MOV, MKV, MPEG\n' +
                '🎵 Аудио: MP3, WAV, OGG, FLAC, Opus, MIDI\n' +
                '🧊 3D: GLB, GLTF, OBJ, FBX, STL (с метаданными)\n' +
                '🔤 Шрифты: TTF, OTF, WOFF, WOFF2 (с метаданными)\n' +
                '📦 Архивы: ZIP, RAR, 7z, TAR, GZ\n' +
                '💻 DEX: classes.dex, odex, vdex, oat\n' +
                '📄 Документы: PDF, DOCX, XLSX, PPTX, EPUB\n' +
                '🎮 Игровые: .sc, .loc, .lang, .assets, .bundle\n' +
                '🤖 AI: ONNX, TFLite, GGUF\n' +
                '🔧 Бинарные: HEX редактор с поиском и переходом');
        });

        document.querySelector('[data-menu="help"]')?.addEventListener('click', () => {
            alert('📱 APK Viewer Pro\n\n' +
                'Горячие клавиши:\n' +
                'Ctrl+O - Открыть APK\n' +
                'Ctrl+F - Поиск файлов\n' +
                'Ctrl+Tab - Следующая вкладка\n' +
                'Esc - Снять выделение\n\n' +
                '🖱️ Клик правой кнопкой - контекстное меню\n' +
                '📦 Открыть как архив - просмотр содержимого архивов\n\n' +
                '📱 На телефонах: кнопка ☰ для меню');
        });

        document.getElementById('welcome-open')?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.apk,.zip';
            input.onchange = (e) => {
                if (e.target.files.length) {
                    APKLoader.load(e.target.files[0]);
                }
            };
            input.click();
        });

        document.getElementById('close-all-tabs')?.addEventListener('click', () => {
            ViewerManager.closeAllTabs();
        });

        document.getElementById('btn-close-apk')?.addEventListener('click', () => {
            if (AppState.get().apkZip) {
                if (confirm('Закрыть APK? Все открытые вкладки будут закрыты.')) {
                    APKLoader.closeAPK();
                }
            }
        });

        const searchInput = document.getElementById('search-input');
        const searchClear = document.getElementById('search-clear');

        searchInput?.addEventListener('input', (e) => {
            SearchManager.search(e.target.value);
        });

        searchClear?.addEventListener('click', () => {
            SearchManager.clear();
            searchInput.focus();
        });

        // Resizer — только для десктопа
        const resizer = document.getElementById('resizer');
        let isResizing = false;

        resizer?.addEventListener('mousedown', (e) => {
            if (state.isMobile) return;
            isResizing = true;
            resizer.classList.add('active');
            document.body.style.cursor = 'col-resize';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isResizing) return;
            const sidebar = document.getElementById('sidebar');
            const newWidth = e.clientX;
            if (newWidth > 120 && newWidth < window.innerWidth - 200) {
                sidebar.style.width = newWidth + 'px';
                AppState.set('sidebarWidth', newWidth);
            }
        });

        document.addEventListener('mouseup', () => {
            if (isResizing) {
                isResizing = false;
                resizer?.classList.remove('active');
                document.body.style.cursor = '';
            }
        });

        // EventBus подписки
        EventBus.subscribe('fileOpen', async ({ path, node }) => {
            try {
                const content = await APKLoader.getFileContent(path);
                await ViewerManager.openFile(path, content, node);
            } catch (err) {
                console.error('Ошибка открытия:', err);
                alert('Не удалось открыть файл: ' + err.message);
            }
        });

        EventBus.subscribe('fileOpenAsArchive', async ({ path, node }) => {
            try {
                const content = await APKLoader.getFileContent(path);
                const ext = Utils.getExtension(path);
                const tab = {
                    path,
                    content,
                    ext,
                    node,
                    viewType: 'archive'
                };
                const state = AppState.get();
                state.openTabs.push(tab);
                const tabIndex = state.openTabs.length - 1;
                ViewerManager.renderTabs();
                ViewerManager.switchTab(tabIndex);
            } catch (err) {
                console.error('Ошибка открытия архива:', err);
                alert('Не удалось открыть архив: ' + err.message);
            }
        });

        ContextMenu.init();
        SearchManager.init();

        ViewerManager.init().then(() => {
            console.log('✅ Monaco Editor инициализирован');
        }).catch(err => {
            console.error('❌ Ошибка инициализации Monaco:', err);
        });

        // Drag and Drop
        let dropCounter = 0;
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('dragenter', (e) => {
            e.preventDefault();
            dropCounter++;
        });
        document.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropCounter--;
        });
        document.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropCounter = 0;
            const files = e.dataTransfer.files;
            if (files.length) {
                const file = files[0];
                if (file.name.endsWith('.apk') || file.name.endsWith('.zip')) {
                    await APKLoader.load(file);
                } else {
                    alert('Пожалуйста, перетащите APK или ZIP-файл.');
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                document.getElementById('welcome-open')?.click();
            }

            if (e.ctrlKey && e.key === 'f') {
                e.preventDefault();
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }

            if (e.ctrlKey && e.key === 'Tab') {
                e.preventDefault();
                const state = AppState.get();
                if (state.openTabs.length > 0) {
                    const next = (state.activeTabIndex + 1) % state.openTabs.length;
                    ViewerManager.switchTab(next);
                }
            }

            if (e.key === 'Escape') {
                const searchInput = document.getElementById('search-input');
                if (document.activeElement === searchInput) {
                    searchInput.blur();
                    SearchManager.clear();
                }
                if (state.isMobile && state.sidebarOpen) {
                    APKLoader.closeSidebar();
                }
            }
        });

        document.getElementById('btn-close-apk').disabled = true;

        console.log('🚀 APK Viewer Pro запущен');
        console.log('📦 Поддерживается 100+ форматов файлов');
        console.log('📱 Адаптирован для мобильных устройств');
    }
};

// ============================================================
// ЗАПУСК
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});