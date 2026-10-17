const Folder = require('../models/Folder');
const FileMeta = require('../models/FileMeta');

// @desc    Create a new folder
// @route   POST /api/folders
// @access  Private
const createFolder = async (req, res, next) => {
  try {
    const { name, parentFolder } = req.body;

    // Check if folder with same name exists in the same parent for this user
    const existingFolder = await Folder.findOne({
      name,
      user: req.user._id,
      parentFolder: parentFolder || null
    });

    if (existingFolder) {
      res.status(400);
      throw new Error('A folder with this name already exists in this directory');
    }

    const folder = await Folder.create({
      name,
      user: req.user._id,
      parentFolder: parentFolder || null
    });

    res.status(201).json({
      success: true,
      data: folder
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all folders for user (or inside a specific parent folder)
// @route   GET /api/folders
// @access  Private
const getFolders = async (req, res, next) => {
  try {
    const { parentFolder } = req.query;

    const query = {
      user: req.user._id,
      parentFolder: parentFolder ? parentFolder : null
    };

    const folders = await Folder.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: folders.length,
      data: folders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a folder
// @route   DELETE /api/folders/:id
// @access  Private
const deleteFolder = async (req, res, next) => {
  try {
    const folder = await Folder.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!folder) {
      res.status(404);
      throw new Error('Folder not found');
    }

    // Optional: Check if folder contains subfolders or files before deletion
    const subFoldersCount = await Folder.countDocuments({ parentFolder: folder._id });
    const filesCount = await FileMeta.countDocuments({ folderId: folder._id });

    if (subFoldersCount > 0 || filesCount > 0) {
      res.status(400);
      throw new Error('Cannot delete folder because it is not empty');
    }

    await folder.deleteOne();

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFolder,
  getFolders,
  deleteFolder
};