// src/app/api/cluster/route.ts

import { NextResponse } from 'next/server';
import { firestore } from '@/firestore';
import { randomUUID } from 'crypto';

interface CreateClusterRequest {
  name: string;
  addresses: string[];
  ownerUid?: string; // Если хотим привязывать к владельцу
}

// Обработчик GET для /api/cluster => список всех clusterId
export async function GET() {
  try {
    const clustersRef = firestore.collection('clusters');
    const snapshot = await clustersRef.get();

    const clusterList: Array<{ clusterId: string }> = [];
    snapshot.forEach((doc) => {
      clusterList.push({ clusterId: doc.id });
    });

    return NextResponse.json(clusterList);
  } catch (error) {
    console.error('GET /cluster Error:', error);
    return NextResponse.json({ error: 'Failed to list clusters' }, { status: 500 });
  }
}

// Обработчик POST для /api/cluster => создать новый кластер
export async function POST(request: Request) {
  try {
    const { name, addresses, ownerUid } = (await request.json()) as CreateClusterRequest;
    if (!name || !Array.isArray(addresses)) {
      return NextResponse.json(
        { error: 'Invalid body: "name" (string) and "addresses" (string[]) are required' },
        { status: 400 }
      );
    }

    const clusterId = randomUUID();
    const docData = {
      name,
      addresses,
      createdAt: new Date().toISOString(),
      ownerUid: ownerUid || null,
    };

    // Создаём документ в коллекции "clusters"
    await firestore.collection('clusters').doc(clusterId).set(docData);

    // Возвращаем clusterId
    return NextResponse.json({ status: 'ok', clusterId });
  } catch (error) {
    console.error('POST /cluster Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
