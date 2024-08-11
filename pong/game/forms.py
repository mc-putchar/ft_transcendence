from django import forms
from api.models import Tournament

class CreateTournamentForm(forms.Form):
	name = forms.CharField(label='Tournament Name', max_length=100, widget=forms.TextInput(attrs={'class': 'form-control'}), required=True)
	player_limit = forms.IntegerField(label='Max Players', widget=forms.NumberInput(attrs={'class': 'form-control'}), required=True, min_value=2, max_value=32)
	prize = forms.DecimalField(label='Prize', widget=forms.NumberInput(attrs={'class': 'form-control'}), required=True, min_value=0)
	entry_fee = forms.DecimalField(label='Entry Fee', widget=forms.NumberInput(attrs={'class': 'form-control'}), required=True, min_value=0)
	on_blockchain = forms.BooleanField(label='On Blockchain', widget=forms.CheckboxInput(attrs={'class': 'form-check-input'}), required=False)

	def is_valid(self):
		return super().is_valid()
	
	def clean(self):
		cleaned_data = super().clean()
		return cleaned_data
	
	def save(self, commit=True):
		tournament = Tournament.objects.create(
			name=self.cleaned_data['name'],
			player_limit=self.cleaned_data['player_limit'],
			prize=self.cleaned_data['prize'],
			entry_fee=self.cleaned_data['entry_fee'],
			on_blockchain=self.cleaned_data['on_blockchain']
		)
		tournament.save()
		return tournament
