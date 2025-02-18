// app/api/quizzes/[id]/route.ts
import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("quizApp");
    
    const quiz = await db.collection("quizzes").findOne({
      _id: new ObjectId(params.id)
    });
    
    if (!quiz) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(quiz);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch quiz' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("quizApp");
    const data = await request.json();
    
    const result = await db.collection("quizzes").updateOne(
      { _id: new ObjectId(params.id) },
      {
        $set: {
          title: data.title,
          description: data.description,
          questions: data.questions,
          updatedAt: new Date()
        }
      }
    );
    
    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Quiz updated successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update quiz' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const client = await clientPromise;
    const db = client.db("quizApp");
    
    const result = await db.collection("quizzes").deleteOne({
      _id: new ObjectId(params.id)
    });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Quiz not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete quiz' },
      { status: 500 }
    );
  }
}