import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../../navigation/AuthNavigator';

type Props = NativeStackScreenProps<AuthStackParamList, 'Participants'>;

type Candidate = {
  id: string;
  name: string;
  title: string;
  company: string;
  avatar: string;
  tags: string[];
};

const MOCK_CANDIDATES: Candidate[] = [
  {
    id: 'c1',
    name: 'Chloé Dubois',
    title: 'Directrice Marketing',
    company: 'WebSolutions',
    avatar: 'https://i.pravatar.cc/100?img=47',
    tags: ['Marketing', 'Stratégie'],
  },
  {
    id: 'c2',
    name: 'Alexandre Petit',
    title: 'Ingénieur logiciel',
    company: 'DataCorp',
    avatar: 'https://i.pravatar.cc/100?img=12',
    tags: ['Tech', 'IA', 'BigData'],
  },
  {
    id: 'c3',
    name: 'Léa Martin',
    title: 'Chef de Projet',
    company: 'Innovatech',
    avatar: 'https://i.pravatar.cc/100?img=32',
    tags: ['GestionDeProjet', 'Startup'],
  },
  {
    id: 'c4',
    name: 'Julien Bernard',
    title: 'UX Designer',
    company: 'CreativeUI',
    avatar: 'https://i.pravatar.cc/100?img=8',
    tags: ['Design', 'UX', 'Mobile'],
  },
  {
    id: 'c5',
    name: 'Emma Moreau',
    title: 'Analyste Financier',
    company: 'FinBank',
    avatar: 'https://i.pravatar.cc/100?img=5',
    tags: ['Finance', 'Investissement'],
  },
];

const ParticipantsScreen: React.FC<Props> = ({ route }) => {
  const { eventId } = route.params;
  const [query, setQuery] = useState('');
  const [selectedInterest, setSelectedInterest] = useState<string | null>(null);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [requested, setRequested] = useState<Record<string, boolean>>({
    c2: true,
    c5: true,
  });

  const filtered = useMemo(() => {
    const list = MOCK_CANDIDATES;
    const q = query.trim().toLowerCase();
    return list.filter((c) => {
      const name = c.name.toLowerCase();
      const company = c.company.toLowerCase();
      const title = c.title.toLowerCase();
      const tags = c.tags.map((t) => t.toLowerCase());

      const queryOk = !q || name.includes(q) || company.includes(q) || title.includes(q);
      const interestOk = !selectedInterest || tags.includes(selectedInterest.toLowerCase());
      const sectorOk = !selectedSector || tags.includes(selectedSector.toLowerCase());
      return queryOk && interestOk && sectorOk;
    });
  }, [query, selectedInterest, selectedSector]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const c of MOCK_CANDIDATES) {
      for (const t of c.tags) set.add(t);
    }
    return Array.from(set).slice(0, 8);
  }, []);

  const interestOptions = allTags.slice(0, 4);
  const sectorOptions = allTags.slice(4);

  return (
    <View style={{ flex: 1, backgroundColor: '#050016', padding: 16 }}>
      <Text style={{ color: '#ffffff', fontSize: 22, fontWeight: '700', marginBottom: 10 }}>
        Participants
      </Text>

      <View
        style={{
          flexDirection: 'row',
          backgroundColor: 'rgba(255, 255, 255, 0.03)',
          borderRadius: 999,
          borderWidth: 1,
          borderColor: 'rgba(123, 92, 255, 0.25)',
          paddingHorizontal: 14,
          paddingVertical: 10,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: 'rgba(255, 255, 255, 0.5)', marginRight: 10 }}>🔍</Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher par nom, entreprise..."
          placeholderTextColor="rgba(255, 255, 255, 0.35)"
          style={{ color: '#ffffff', flex: 1 }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          gap: 10,
          marginBottom: 14,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            const next = interestOptions[(interestOptions.indexOf(selectedInterest || '') + 1) % interestOptions.length];
            setSelectedInterest(selectedInterest ? null : next);
          }}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(123, 92, 255, 0.25)',
            paddingVertical: 10,
            paddingHorizontal: 14,
            flex: 1,
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '600' }}>
            Centres d'intérêt{' '}
            <Text style={{ color: '#c0b8ff', fontWeight: '500' }}>
              {selectedInterest ? `: ${selectedInterest}` : ''}
            </Text>
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            const next = sectorOptions[(sectorOptions.indexOf(selectedSector || '') + 1) % sectorOptions.length];
            setSelectedSector(selectedSector ? null : next);
          }}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderRadius: 999,
            borderWidth: 1,
            borderColor: 'rgba(123, 92, 255, 0.25)',
            paddingVertical: 10,
            paddingHorizontal: 14,
            flex: 1,
          }}
        >
          <Text style={{ color: '#ffffff', fontWeight: '600' }}>
            Secteur d'activité{' '}
            <Text style={{ color: '#c0b8ff', fontWeight: '500' }}>
              {selectedSector ? `: ${selectedSector}` : ''}
            </Text>
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {allTags.slice(0, 6).map((t) => {
          const selected = selectedInterest === t || selectedSector === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => {
                if (selected) {
                  if (selectedInterest === t) setSelectedInterest(null);
                  if (selectedSector === t) setSelectedSector(null);
                  return;
                }
                if (!selectedInterest) setSelectedInterest(t);
                else setSelectedSector(t);
              }}
              style={{
                backgroundColor: selected ? '#7b5cff' : 'rgba(255, 255, 255, 0.03)',
                borderRadius: 999,
                borderWidth: 1,
                borderColor: 'rgba(123, 92, 255, 0.25)',
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Text style={{ color: '#ffffff', fontWeight: selected ? '700' : '500' }}>#{t}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={{ color: '#a0a0c0', marginBottom: 10 }}>
        {filtered.length} candidat(s) · eventId: {eventId}
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        renderItem={({ item }) => {
          const isRequested = !!requested[item.id];
          return (
            <View
              style={{
                backgroundColor: '#0b0620',
                borderRadius: 22,
                padding: 14,
                borderWidth: 1,
                borderColor: 'rgba(123, 92, 255, 0.25)',
                marginBottom: 14,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={{ uri: item.avatar }}
                  style={{ width: 56, height: 56, borderRadius: 28, marginRight: 12 }}
                />

                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '800' }}>
                    {item.name}
                  </Text>
                  <Text style={{ color: '#a0a0c0', marginTop: 2 }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: '#a0a0c0', marginTop: 2 }}>
                    chez {item.company}
                  </Text>

                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {item.tags.slice(0, 3).map((t) => (
                      <Text key={t} style={{ color: '#7b5cff', fontWeight: '600' }}>
                        #{t}
                      </Text>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => {
                    if (isRequested) return;
                    setRequested((prev) => ({ ...prev, [item.id]: true }));
                  }}
                  style={{
                    backgroundColor: isRequested ? 'rgba(255, 255, 255, 0.08)' : '#7b5cff',
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: 'rgba(123, 92, 255, 0.25)',
                  }}
                >
                  <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                    {isRequested ? 'Demande envoyée' : 'Se connecter'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      <View
        style={{
          paddingVertical: 10,
          alignItems: 'center',
          borderTopWidth: 1,
          borderTopColor: 'rgba(123, 92, 255, 0.15)',
        }}
      >
        <Text style={{ color: '#a0a0c0', fontSize: 12 }}>
          Front-only: demandes de connexion simulées
        </Text>
      </View>
    </View>
  );
};

export default ParticipantsScreen;
