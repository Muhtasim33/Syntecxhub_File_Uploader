const Folder = require('../models/Folder');
const FileMeta = require('../models/FileMeta');

const getDescendantFolderIds = async (folderId, ownerId) => {
  const ids = [folderId];
  let parents = [folderId];

  while (parents.length) {
    const children = await Folder.find(
      { ownerId, parentFolderId: { $in: parents } },
      { _id: 1 }
    ).lean();
    parents = children.map(folder => folder._id);
    ids.push(...parents);
  }

  return ids;
};

const createFolder = async (req, res, next) => {
  try {
    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const parentFolderId = req.body?.parentFolderId || null;
    if (!name || name.length > 255) {
      res.status(400);
      throw new Error('Folder name must be between 1 and 255 characters');
    }

    if (parentFolderId) {
      const parent = await Folder.findOne({
        _id: parentFolderId,
        ownerId: req.user._id,
        isTrashed: false
      });
      if (!parent) {
        res.status(404);
        throw new Error('Parent folder not found');
      }
    }

    const existingFolder = await Folder.findOne({
      name,
      ownerId: req.user._id,
      parentFolderId,
      isTrashed: false
    });
    if (existingFolder) {
      res.status(409);
      throw new Error('A folder with this name already exists here');
    }

    const folder = await Folder.create({
      name,
      ownerId: req.user._id,
      parentFolderId
    });
    res.status(201).json({ success: true, data: folder });
  } catch (error) {
    next(error);
  }
};

const getFolders = async (req, res, next) => {
  try {
    const { parentFolderId, view, search } = req.query;
    const query = { ownerId: req.user._id, isTrashed: view === 'trash' };
    if (view === 'starred') {
      query.isTrashed = false;
      query.isStarred = true;
    } else if (view === 'recent') {
      query.isTrashed = false;
      query.lastAccessedAt = { $ne: null };
    } else if (view !== 'trash' && view !== 'all') {
      query.parentFolderId = parentFolderId || null;
    }
    if (search) {
      const escapedSearch = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.name = { $regex: escapedSearch, $options: 'i' };
    }

    let folders = await Folder.find(query)
      .sort(view === 'recent' ? { lastAccessedAt: -1 } : { createdAt: -1 });
    if (view === 'trash') {
      const trashedIds = new Set(folders.map(folder => folder._id.toString()));
      folders = folders.filter(folder => (
        !folder.parentFolderId || !trashedIds.has(folder.parentFolderId.toString())
      ));
    }
    res.json({ success: true, count: folders.length, data: folders });
  } catch (error) {
    next(error);
  }
};

const trashFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      isTrashed: false
    });
    if (!folder) {
      res.status(404);
      throw new Error('Folder not found');
    }

    const trashedAt = new Date();
    const folderIds = await getDescendantFolderIds(folder._id, req.user._id);
    await Promise.all([
      Folder.updateMany(
        { _id: { $in: folderIds }, ownerId: req.user._id },
        { $set: { isTrashed: true, trashedAt } }
      ),
      FileMeta.updateMany(
        { folderId: { $in: folderIds }, ownerId: req.user._id, isTrashed: false },
        { $set: { isTrashed: true, trashedAt } }
      )
    ]);
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

const restoreFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      isTrashed: true
    });
    if (!folder) {
      res.status(404);
      throw new Error('Trashed folder not found');
    }

    const folderIds = await getDescendantFolderIds(folder._id, req.user._id);
    await Promise.all([
      Folder.updateMany(
        { _id: { $in: folderIds }, ownerId: req.user._id, isTrashed: true },
        { $set: { isTrashed: false, trashedAt: null } }
      ),
      FileMeta.updateMany(
        {
          folderId: { $in: folderIds },
          ownerId: req.user._id,
          isTrashed: true,
          trashedAt: folder.trashedAt
        },
        { $set: { isTrashed: false, trashedAt: null } }
      )
    ]);
    res.json({ success: true, data: {} });
  } catch (error) {
    next(error);
  }
};

const toggleFolderStar = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      ownerId: req.user._id,
      isTrashed: false
    });
    if (!folder) {
      res.status(404);
      throw new Error('Folder not found');
    }
    folder.isStarred = !folder.isStarred;
    await folder.save();
    res.json({ success: true, data: folder });
  } catch (error) {
    next(error);
  }
};

const touchFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id, isTrashed: false },
      { lastAccessedAt: new Date() },
      { new: true }
    );
    if (!folder) {
      res.status(404);
      throw new Error('Folder not found');
    }
    res.json({ success: true, data: folder });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFolder,
  getFolders,
  trashFolder,
  restoreFolder,
  toggleFolderStar,
  touchFolder
};
