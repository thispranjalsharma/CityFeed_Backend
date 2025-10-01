import mongoose from 'mongoose';

export function toCamelCase(str: string): string {
  if (!str) return str;
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function formatNamesCamelCase(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(formatNamesCamelCase);
  } else if (obj instanceof Date) {
    return obj; // Return Date objects as-is
  } else if (obj && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      if ((key === 'name' || key === 'title') && typeof obj[key] === 'string') {
        newObj[key] = toCamelCase(obj[key]);
      } else {
        newObj[key] = formatNamesCamelCase(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
} 

export function objectIdsToStrings(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(objectIdsToStrings);
  } else if (obj && typeof obj === 'object') {
    // Preserve Date objects
    if (obj instanceof Date) {
      return obj;
    }
    if (obj instanceof mongoose.Types.ObjectId || obj._bsontype === 'ObjectId') {
      return obj.toString();
    }
    const newObj: any = {};
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      newObj[key] = objectIdsToStrings(obj[key]);
    }
    return newObj;
  }
  return obj;
} 

export function datesToISOString(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(datesToISOString);
  } else if (obj instanceof Date) {
    return obj.toISOString();
  } else if (obj && typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      newObj[key] = datesToISOString(obj[key]);
    }
    return newObj;
  }
  return obj;
}
