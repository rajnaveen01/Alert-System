from pymongo import MongoClient
from decouple import config
from bson import ObjectId
from .database import db

def insert_document(collection_name, document):
    collection = db[collection_name]
    result = collection.insert_one(document)
    return str(result.inserted_id)

def update_document(collection_name, document_id, update_data):
    collection = db[collection_name]
    result = collection.update_one({"_id": ObjectId(document_id)}, {"$set": update_data})
    return result.modified_count > 0

def view_document(collection_name, query):
    collection = db[collection_name]
    document = collection.find_one(query)
    if document:
        document['_id'] = str(document['_id'])
    return document