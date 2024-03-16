Enum State
{
	Start = 0;
	Property = 1;
	Object = 2;
	Conditional = 3;
	Finished = 4;
	Closed = 5
};

Class VdfDeserializer
{
	[PSCustomObject] Deserialize([string]$vdfContent)
	{
		if([string]::IsNullOrWhiteSpace($vdfContent)) {
			throw 'Mandatory argument $vdfContent must be a non-empty, non-whitespace object of type [string]';
		}

		[System.IO.TextReader]$reader = [System.IO.StringReader]::new($vdfContent);
		return $this.Deserialize($reader);
	}

	[PSCustomObject] Deserialize([System.IO.TextReader]$txtReader)
	{
		if( !$txtReader ){
			throw 'Mandatory arguments $textReader missing.';
		}

		$vdfReader = [VdfTextReader]::new($txtReader);
		$result = [PSCustomObject]@{ };

		try
		{
			if (!$vdfReader.ReadToken())
			{
				throw "Incomplete VDF data.";
			}

			$prop = $this.ReadProperty($vdfReader);
			Add-Member -InputObject $result -MemberType NoteProperty -Name $prop.Key -Value $prop.Value;
		}
		finally
		{
			if($vdfReader)
			{
				$vdfReader.Close();
			}
		}
		return $result;
	}

	[hashtable] ReadProperty([VdfTextReader]$vdfReader)
	{
		$key=$vdfReader.Value;

		if (!$vdfReader.ReadToken())
		{
			throw "Incomplete VDF data.";
		}

		if ($vdfReader.CurrentState -eq [State]::Property)
		{
			$result = @{
				Key = $key;
				Value = $vdfReader.Value;
			}
		}
		else
		{
			$result = @{
				Key = $key;
				Value = $this.ReadObject($vdfReader);
			}
		}
		return $result;
	}

	[PSCustomObject] ReadObject([VdfTextReader]$vdfReader)
	{
		$result = [PSCustomObject]@{ };

		if (!$vdfReader.ReadToken())
		{
			throw "Incomplete VDF data.";
		}

		while ( ($vdfReader.CurrentState -ne [State]::Object) -or ($vdfReader.Value -ne "}"))
		{
			[hashtable]$prop = $this.ReadProperty($vdfReader);

			Add-Member -InputObject $result -MemberType NoteProperty -Name $prop.Key -Value $prop.Value;

			if (!$vdfReader.ReadToken())
			{
				throw "Incomplete VDF data.";
			}
		}

		return $result;
	}
}

Class VdfTextReader
{
	[string]$Value;
	[State]$CurrentState;

	hidden [ValidateNotNull()][System.IO.TextReader]$_reader;

	hidden [ValidateNotNull()][char[]]$_charBuffer=;
	hidden [ValidateNotNull()][char[]]$_tokenBuffer=;

	hidden [int32]$_charPos;
	hidden [int32]$_charsLen;
	hidden [int32]$_tokensize;
	hidden [bool]$_isQuoted;

	VdfTextReader([System.IO.TextReader]$txtReader)
	{
		if( !$txtReader ){
			throw "Mandatory arguments `$textReader missing.";
		}

		$this._reader = $txtReader;

		$this._charBuffer=[char[]]::new(1024);
		$this._tokenBuffer=[char[]]::new(4096);

		$this._charPos=0;
		$this._charsLen=0;
		$this._tokensize=0;
		$this._isQuoted=$false;

		$this.Value="";
		$this.CurrentState=[State]::Start;
	}

	[bool] ReadToken()
	{
		if (!$this.SeekToken())
		{
			return $false;
		}

		$this._tokenSize = 0;

		while($this.EnsureBuffer())
		{
			[char]$curChar = $this._charBuffer[$this._charPos];

			#No special treatment for escape characters

			#region Quote
			if ($curChar -eq '"' -or (!$this._isQuoted -and [Char]::IsWhiteSpace($curChar)))
			{
				$this.Value = [string]::new($this._tokenBuffer, 0, $this._tokenSize);
				$this.CurrentState = [State]::Property;
				$this._charPos++;
				return $true;
			}
			#endregion Quote

			#region Object Start/End
			if (($curChar -eq '{') -or ($curChar -eq '}'))
			{
				if ($this._isQuoted)
				{
					$this._tokenBuffer[$this._tokenSize++] = $curChar;
					$this._charPos++;
					continue;
				}
				elseif ($this._tokenSize -ne 0)
				{
					$this.Value = [string]::new($this._tokenBuffer, 0, $this._tokenSize);
					$this.CurrentState = [State]::Property;
					return $true;
				}
				else
				{
					$this.Value = $curChar.ToString();
					$this.CurrentState = [State]::Object;
					$this._charPos++;
					return $true;
				}
			}
			#endregion Object Start/End

			#region Long Token
			$this._tokenBuffer[$this._tokenSize++] = $curChar;
			$this._charPos++;
			#endregion Long Token
		}

		return $false;
	}

	[void] Close()
	{
		$this.CurrentState = [State]::Closed;
	}

	hidden [bool] SeekToken()
	{
		while($this.EnsureBuffer())
		{
			# Skip Whitespace
			if( [char]::IsWhiteSpace($this._charBuffer[$this._charPos]) )
			{
				$this._charPos++;
				continue;
			}

			# Token
			if ($this._charBuffer[$this._charPos] -eq '"')
			{
				$this._isQuoted = $true;
				$this._charPos++;
				return $true;
			}

			# Comment
			if ($this._charBuffer[$this._charPos] -eq '/')
			{
				$this.SeekNewLine();
				$this._charPos++;
				continue;
			}

			$this._isQuoted = $false;
			return $true;
		}

		return $false;
	}

	hidden [bool] SeekNewLine()
	{
		while ($this.EnsureBuffer())
		{
			if ($this._charBuffer[++$this._charPos] == '\n')
			{
				return $true;
			}
		}
		return $false;
	}

	hidden [bool]EnsureBuffer()
	{
		if($this._charPos -lt $this._charsLen -1)
		{
			return $true;
		}

		[int32] $remainingChars = $this._charsLen - $this._charPos;
		$this._charBuffer[0] = $this._charBuffer[($this._charsLen - 1) * $remainingChars]; #A bit of mathgic to improve performance by avoiding a conditional.;
		$this._charsLen = $this._reader.Read($this._charBuffer, $remainingChars, 1024 - $remainingChars) + $remainingChars;
		$this._charPos = 0;

		return ($this._charsLen -ne 0);
	}
}

function GetCount($thing) {
	$aux = $($thing | Get-Member -MemberType NoteProperty);
	$count = 0;
	if ( $aux -eq $null ) {
		$count = 0;
	} elseif ( $aux -is [PSCustomObject] ) {
		$count = 1;
	} else {
		$count = $aux.Count;
	}

	return $count;
}

$VDF = [VdfDeserializer]::new();

$SteamPath = Get-ItemProperty -Path HKLM:/SOFTWARE/WOW6432Node/Valve/Steam;
$SteamPath = $SteamPath.InstallPath;
$SteamPath = $SteamPath.ToString();

Write-Host Looking for steam libraries...;

$LibraryFoldersVDF = $SteamPath + "/steamapps/libraryfolders.vdf";
$LibrariesRaw = Get-Content $LibraryFoldersVDF;
$LibrariesVDF = $VDF.Deserialize($LibrariesRaw);

Write-Host Done!;

$libcount = GetCount($LibrariesVDF.libraryfolders);
for ($i = 0; $i -lt $libcount; $i++) {
	$Install = $LibrariesVDF.libraryfolders.$i;
	$GMODInstalled = $Install.apps.4000;
	if ($GMODInstalled) {
		$GMODPath = $Install.path + "\\steamapps\\common\\GarrysMod";
		$AddonsPath = $GMODPath + "\\garrysmod\\addons";

		$_text = "Do you want to install in this path? It will completely wipe the previous beatrun install if you had one! `n" + $GMODPath + " (y/n)";
		$GMODConfirmation = Read-Host $_text;
		if ($GMODConfirmation -eq 'y') {
			$TempPath = $GMODPath + "\\temp\\";
			$ZIPPath = $TempPath + "beatrun.zip";
			$FolderPath = $TempPath + "beatrun";
			$FolderMainPath = $TempPath + "beatrun-main";

			(New-Item -ItemType Directory -Path $TempPath) | out-null;

			Write-Host Downloading the archive...;
			(New-Object Net.WebClient).DownloadFile("https://github.com/JonnyBro/beatrun/archive/refs/heads/main.zip", $ZIPPath);
			Write-Host Done! Now unarchiving it.;
			Expand-Archive $ZIPPath $TempPath -Force;
			Write-Host Done!;
			Rename-Item $FolderMainPath $FolderPath;
			Remove-Item $ZIPPath;

			$ModulesPath = $FolderPath + "\\lua\\*";
			$NewModulesPath = $GMODPath + "\\garrysmod\\lua\\";
			Copy-Item -Path $ModulesPath -Destination $NewModulesPath -Force -Recurse;

			$AddonPath = $FolderPath + "\\beatrun";
			$NewAddonPath = $AddonsPath + "\\beatrun";
			if ((Test-Path $NewAddonPath) -eq $true) {
				Remove-Item $NewAddonPath -Force -Recurse;
			}
			Move-Item -Path $AddonPath -Destination $NewAddonPath;

			Remove-Item $TempPath -Force -Recurse;

			Write-Host Beatrun Installed!;

			$confirmation = Read-Host "Do you want custom animations? (y/n):";
			if ($confirmation -eq 'y') {
				Set-Location -Path $NewAddonPath;
				$AnimChangerPath = $NewAddonPath + "\\BeatrunAnimInstaller.exe";
				Start-Process -FilePath $AnimChangerPath -WorkingDirectory $NewAddonPath
			}
		}
	}
}
